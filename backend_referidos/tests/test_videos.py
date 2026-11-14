import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from flask import Flask
from requests import Timeout
from routes import colaboradores, qr, videos
import sheets_api
from video_utils import normalizar_url_youtube


class VideosTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        self.app.logger.disabled = True
        videos.register_videos_routes(self.app)
        qr.register_qr_routes(self.app)
        self.client = self.app.test_client()
        self.video = {'id': 'video-1', 'titulo': 'Presentación', 'url_youtube': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'orden': 1}
        self.auth = self.enterContext(patch.object(colaboradores, 'verificar_colaborador', side_effect=lambda code: {
            'valido': code in ('ADMIN', 'OWN'), 'rol': 'admin' if code == 'ADMIN' else 'colaborador',
        }))
        self.listar = self.enterContext(patch.object(videos, 'obtener_videos', return_value=[self.video]))
        self.token = self.enterContext(patch.object(videos, 'verificar_video_token', return_value=True))
        self.qr_token = self.enterContext(patch.object(qr, 'verificar_video_token', return_value=True))
        self.crear = self.enterContext(patch.object(videos, 'crear_video', return_value={'success': True, 'video': self.video}))
        self.editar = self.enterContext(patch.object(videos, 'editar_video', return_value={'success': True, 'video': self.video}))
        self.eliminar = self.enterContext(patch.object(videos, 'eliminar_video', return_value={'success': True}))
        self.enterContext(patch('requests.sessions.Session.request', side_effect=AssertionError('No llamar a servicios reales')))

    def request(self, method, url='/videos', role='ADMIN', data=None, headers=None):
        return self.client.open(url, method=method, json=data, headers=headers or {'Authorization': f'Bearer {role}'})

    def test_every_route_requires_access(self):
        for method, url in [('GET', '/videos'), ('POST', '/videos'), ('PUT', '/videos/v1'), ('DELETE', '/videos/v1')]:
            with self.subTest(method=method):
                self.assertEqual(self.client.open(url, method=method).status_code, 401)
        self.listar.assert_not_called()

    def test_collaborators_and_referrals_cannot_modify_videos(self):
        for method, url in [('POST', '/videos'), ('PUT', '/videos/v1'), ('DELETE', '/videos/v1')]:
            self.assertEqual(self.request(method, url, role='OWN', data=self.video).status_code, 403)
            self.assertEqual(self.request(method, url, headers={'X-Video-Token': 'valid-token'}, data=self.video).status_code, 401)
        self.crear.assert_not_called()
        self.editar.assert_not_called()
        self.eliminar.assert_not_called()

    def test_valid_referral_token_reads_catalog_without_admin_session(self):
        result = self.request('GET', headers={'X-Video-Token': 'valid-token'})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json, [self.video])
        self.auth.assert_not_called()
        self.token.assert_called_once_with('valid-token')

    def test_invalid_referral_token_cannot_read_even_with_admin_header(self):
        self.token.return_value = False
        result = self.request('GET', headers={'X-Video-Token': 'invalid', 'Authorization': 'Bearer ADMIN'})
        self.assertEqual(result.status_code, 401)
        self.listar.assert_not_called()

    def test_token_service_failure_never_grants_access(self):
        self.token.side_effect = Timeout()
        self.assertEqual(self.request('GET', headers={'X-Video-Token': 'valid-token'}).status_code, 502)
        self.listar.assert_not_called()

    def test_catalog_is_sorted_and_urls_are_canonical(self):
        self.listar.return_value = [self.video, {**self.video, 'id': 'video-2', 'orden': 0, 'url_youtube': 'https://youtu.be/dQw4w9WgXcQ?t=10'}]
        result = self.request('GET')
        self.assertEqual(result.status_code, 200)
        self.assertEqual([row['id'] for row in result.json], ['video-2', 'video-1'])
        self.assertEqual(result.json[0]['url_youtube'], self.video['url_youtube'])

    def test_admin_can_create_edit_and_delete(self):
        self.assertEqual(self.request('POST', data=self.video).status_code, 201)
        self.assertEqual(self.request('PUT', '/videos/video-1', data=self.video).status_code, 200)
        self.assertEqual(self.request('DELETE', '/videos/video-1').status_code, 200)
        expected = {key: self.video[key] for key in ('titulo', 'url_youtube', 'orden')}
        self.crear.assert_called_once_with(**expected)
        self.editar.assert_called_once_with('video-1', **expected)
        self.eliminar.assert_called_once_with('video-1')

    def test_invalid_video_never_reaches_sheets(self):
        for payload in [None, [], {}, {**self.video, 'titulo': ' '}, {**self.video, 'orden': -1}, {**self.video, 'orden': True}, {**self.video, 'orden': 1.5}, {**self.video, 'url_youtube': 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'}, {**self.video, 'url_youtube': 'javascript:alert(1)'}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.request('POST', data=payload).status_code, 400)
        self.crear.assert_not_called()

    def test_missing_video_returns_not_found(self):
        self.editar.return_value = {'success': False, 'code': 'NOT_FOUND', 'error': 'Video no encontrado'}
        self.assertEqual(self.request('PUT', '/videos/missing', data=self.video).status_code, 404)

    def test_storage_failures_are_reported_without_fake_success(self):
        self.crear.return_value = {'success': False, 'code': 'FORBIDDEN'}
        self.assertEqual(self.request('POST', data=self.video).status_code, 502)
        self.crear.side_effect = RuntimeError('Missing config')
        self.assertEqual(self.request('POST', data=self.video).status_code, 502)
        self.crear.side_effect = None
        self.crear.return_value = {'success': True}
        self.assertEqual(self.request('POST', data=self.video).status_code, 502)

    def test_invalid_sheet_url_is_never_served_as_an_iframe(self):
        self.listar.return_value = [{**self.video, 'url_youtube': 'https://evil.test/'}]
        self.assertEqual(self.request('GET').status_code, 502)

    def test_verify_token_endpoint_checks_the_saved_token(self):
        self.assertEqual(self.client.get('/verificar-token').status_code, 400)
        self.qr_token.assert_not_called()
        self.assertEqual(self.client.get('/verificar-token?token=real').status_code, 200)
        self.qr_token.assert_called_once_with('real')
        self.qr_token.return_value = False
        self.assertEqual(self.client.get('/verificar-token?token=inventado').status_code, 401)
        self.qr_token.side_effect = Timeout()
        self.assertEqual(self.client.get('/verificar-token?token=real').status_code, 502)

    def test_youtube_supported_formats_and_host_validation(self):
        for url in ['youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']:
            self.assertEqual(normalizar_url_youtube(url), self.video['url_youtube'])
        for url in ['https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ', 'https://evil.test@youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/playlist?list=abc', 'https://youtu.be/invalid']:
            with self.assertRaises(ValueError):
                normalizar_url_youtube(url)


class SheetsVideoBridgeTests(unittest.TestCase):
    def test_mutations_send_secret_only_to_apps_script(self):
        with patch.dict(os.environ, {'APPS_SCRIPT_EDIT_SECRET': 'test-secret'}), patch.object(sheets_api.requests, 'post') as post:
            post.return_value.json.return_value = {'success': True, 'video': {'id': '1'}}
            sheets_api.crear_video('Titulo', 'https://youtu.be/dQw4w9WgXcQ', 1)
            self.assertEqual(post.call_args.kwargs['json']['edit_secret'], 'test-secret')
            self.assertEqual(post.call_args.kwargs['json']['action'], 'crearVideo')
            post.return_value.raise_for_status.assert_called_once()

    def test_missing_secret_fails_before_any_write(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(sheets_api.requests, 'post') as post:
            with self.assertRaises(RuntimeError):
                sheets_api.eliminar_video('1')
            post.assert_not_called()

    def test_token_is_verified_by_apps_script_not_by_nonempty_string(self):
        with patch.object(sheets_api.requests, 'get') as get:
            get.return_value.json.return_value = {'valido': False}
            self.assertFalse(sheets_api.verificar_video_token('inventado'))
            get.return_value.json.return_value = {'valido': True}
            self.assertTrue(sheets_api.verificar_video_token('real'))
            self.assertEqual(get.call_args.kwargs['params'], {'action': 'verificarToken', 'token': 'real'})
            get.return_value.json.return_value = {'success': False, 'error': 'No hay hoja'}
            with self.assertRaises(ValueError):
                sheets_api.verificar_video_token('real')


if __name__ == '__main__':
    unittest.main()
