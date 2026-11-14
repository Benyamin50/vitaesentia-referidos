import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from threading import Lock
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from flask import Flask
from requests import HTTPError, Timeout
from routes import qr
import sheets_api


class Inputs(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.values = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'input' and values.get('name'):
            if values.get('type') != 'checkbox' or 'checked' in values:
                self.values[values['name']] = values.get('value', '')


class RegistroReferidosTests(unittest.TestCase):
    def setUp(self):
        backend = Path(__file__).resolve().parents[1]
        self.app = Flask(__name__, template_folder=str(backend / 'templates'))
        self.app.config.update(TESTING=True, FORM_SIGNING_SECRET='test-stable-form-secret')
        self.app.logger.disabled = True
        qr.register_qr_routes(self.app)
        self.client = self.app.test_client()
        self.verify = self.enterContext(patch.object(qr, 'verificar_colaborador', return_value={'valido': True, 'nombre': 'Colaborador'}))
        self.enterContext(patch.object(qr, 'obtener_geolocalizacion', return_value=('', '')))
        self.save = self.enterContext(patch.object(qr, 'registrar_referido', return_value={'success': True}))
        self.enterContext(patch('requests.sessions.Session.request', side_effect=AssertionError('No llamar a servicios reales')))

    def form(self, ref='OWN'):
        response = self.client.get('/qr?ref=' + ref)
        self.assertEqual(response.status_code, 200)
        values = Inputs(response.get_data(as_text=True)).values
        values.update(nombre='Ana', apellido='Prueba', email='ana@example.invalid', telefono='123456789', acepto_datos='1')
        return values

    def token(self, response):
        self.assertEqual(response.status_code, 303)
        return parse_qs(urlparse(response.headers['Location']).query)['token'][0]

    def test_get_creates_unique_form_without_saving(self):
        first, second = self.form(), self.form()
        self.assertNotEqual(first['submission_id'], second['submission_id'])
        self.assertTrue(first['submission_token'])
        self.save.assert_not_called()

    def test_success_redirects_with_303_and_no_javascript_navigation(self):
        response = self.client.post('/qr?ref=OWN', data=self.form())
        token = self.token(response)
        sent = self.save.call_args.args[0]
        self.assertEqual(token, sent['video_token'])
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        self.assertNotIn('window.location.href', response.get_data(as_text=True))
        self.assertEqual(sent['acepto_datos'], 1)

    def test_same_submission_keeps_both_ids_and_returns_one_stored_record(self):
        form, rows = self.form(), {}
        def save(data):
            duplicate = data['submission_id'] in rows
            rows.setdefault(data['submission_id'], dict(data))
            return {'success': True, 'duplicate': duplicate, 'video_token': rows[data['submission_id']]['video_token']}
        self.save.side_effect = save
        first = self.client.post('/qr?ref=OWN', data=form)
        second = self.client.post('/qr?ref=OWN', data=form)
        self.assertEqual(self.token(first), self.token(second))
        self.assertEqual(len(rows), 1)
        payloads = [call.args[0] for call in self.save.call_args_list]
        self.assertEqual(payloads[0]['submission_id'], payloads[1]['submission_id'])
        self.assertEqual(payloads[0]['video_token'], payloads[1]['video_token'])

    def test_concurrent_posts_share_the_key_for_atomic_storage_deduplication(self):
        form, rows, lock = self.form(), {}, Lock()
        def save(data):
            with lock:
                rows.setdefault(data['submission_id'], dict(data))
                return {'success': True, 'video_token': rows[data['submission_id']]['video_token']}
        self.save.side_effect = save
        def post(_):
            with self.app.test_client() as client:
                return client.post('/qr?ref=OWN', data=form)
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(post, range(2)))
        self.assertEqual(self.token(responses[0]), self.token(responses[1]))
        self.assertEqual(len(rows), 1)

    def test_save_then_timeout_retry_preserves_fields_and_ids(self):
        form, rows = self.form(), {}
        def save(data):
            if data['submission_id'] not in rows:
                rows[data['submission_id']] = dict(data)
                raise Timeout('Se guardó pero se perdió la respuesta')
            return {'success': True, 'duplicate': True, 'video_token': rows[data['submission_id']]['video_token']}
        self.save.side_effect = save
        response = self.client.post('/qr?ref=OWN', data=form)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('Location', response.headers)
        retry = Inputs(response.get_data(as_text=True)).values
        self.assertEqual(retry, form)
        success = self.client.post('/qr?ref=OWN', data=retry)
        self.assertEqual(self.token(success), rows[form['submission_id']]['video_token'])
        self.assertEqual(len(rows), 1)

    def test_storage_errors_never_redirect_and_keep_same_form(self):
        form = self.form()
        for result in [None, [], {'success': False}, {'success': 'true'}, {'success': True, 'error': 'No guardado'}, {'success': True, 'video_token': 'invalid'}]:
            self.save.return_value = result
            with self.subTest(result=result):
                response = self.client.post('/qr?ref=OWN', data=form)
                self.assertEqual(response.status_code, 502)
                self.assertNotIn('Location', response.headers)
                self.assertEqual(Inputs(response.get_data(as_text=True)).values, form)

    def test_duplicate_uses_token_returned_by_storage(self):
        existing = 'e' * 43
        self.save.return_value = {'success': True, 'duplicate': True, 'video_token': existing}
        self.assertEqual(self.token(self.client.post('/qr?ref=OWN', data=self.form())), existing)

    def test_invalid_fields_do_not_write_and_keep_submission_id(self):
        for field in ['nombre', 'apellido', 'email', 'telefono', 'acepto_datos']:
            form = self.form()
            form[field] = ''
            response = self.client.post('/qr?ref=OWN', data=form)
            self.assertEqual(response.status_code, 400)
            self.assertEqual(Inputs(response.get_data(as_text=True)).values['submission_id'], form['submission_id'])
        self.save.assert_not_called()

    def test_unsigned_tampered_or_cross_invitation_submissions_do_not_write(self):
        original = self.form()
        for form, ref in [
            ({**original, 'submission_token': ''}, 'OWN'),
            ({**original, 'submission_token': original['submission_token'] + 'x'}, 'OWN'),
            ({**original, 'submission_id': 'changed'}, 'OWN'),
            (original, 'OTHER'),
        ]:
            self.assertEqual(self.client.post('/qr?ref=' + ref, data=form).status_code, 400)
        self.save.assert_not_called()

    def test_invalid_invitation_does_not_write(self):
        form = self.form()
        self.verify.return_value = {'valido': False}
        self.assertEqual(self.client.post('/qr?ref=OWN', data=form).status_code, 404)
        self.save.assert_not_called()

    def test_template_escapes_values_when_retrying(self):
        form = self.form()
        form['nombre'] = '\"><script>alert(1)</script>'
        self.save.side_effect = Timeout()
        response = self.client.post('/qr?ref=OWN', data=form)
        html = response.get_data(as_text=True)
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertEqual(Inputs(html).values['nombre'], form['nombre'])


class RegistroBridgeTests(unittest.TestCase):
    def test_payload_forwards_stable_id_and_token_and_checks_http_status(self):
        data = {'submission_id': 'same-id', 'video_token': 'same-token'}
        with patch.object(sheets_api.requests, 'post') as post:
            post.return_value.json.return_value = {'success': True, 'duplicate': True, 'video_token': 'same-token'}
            result = sheets_api.registrar_referido(data)
            self.assertTrue(result['duplicate'])
            self.assertEqual(post.call_args.kwargs['json'], {**data, 'action': 'registrarReferido'})
            post.return_value.raise_for_status.assert_called_once()

    def test_missing_id_never_writes(self):
        with patch.object(sheets_api.requests, 'post') as post:
            with self.assertRaises(ValueError):
                sheets_api.registrar_referido({})
            post.assert_not_called()

    def test_unconfirmed_or_malformed_response_is_rejected(self):
        with patch.object(sheets_api.requests, 'post') as post:
            for result in [[], None, {}, {'success': False}, {'success': 'true'}, {'success': True, 'error': 'Error'}]:
                post.return_value.json.return_value = result
                with self.subTest(result=result), self.assertRaises(ValueError):
                    sheets_api.registrar_referido({'submission_id': 'same-id'})

    def test_http_error_is_not_retried_or_treated_as_success(self):
        with patch.object(sheets_api.requests, 'post') as post:
            post.return_value.raise_for_status.side_effect = HTTPError()
            with self.assertRaises(HTTPError):
                sheets_api.registrar_referido({'submission_id': 'same-id'})
            self.assertEqual(post.call_count, 1)
            post.return_value.json.assert_not_called()


if __name__ == '__main__':
    unittest.main()
