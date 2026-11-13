import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from flask import Flask
from requests import Timeout
from routes import colaboradores, referidos


class PermisosReferidosTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        self.app.logger.disabled = True
        colaboradores.register_colaboradores_routes(self.app)
        referidos.register_referidos_routes(self.app)
        self.client = self.app.test_client()
        self.rows = [
            {'id': 1, 'nombre': 'Propietario', 'codigo_unico': 'OWN'},
            {'id': 2, 'nombre': 'Otro colaborador', 'codigo_unico': 'OTHER'},
        ]
        self.verify = self.enterContext(patch.object(
            colaboradores, 'verificar_colaborador',
            side_effect=lambda code: {
                'valido': code in {'ADMIN', 'OWN', 'OTHER'},
                'rol': 'admin' if code == 'ADMIN' else 'colaborador',
            },
        ))
        self.get_rows = self.enterContext(patch.object(
            colaboradores, 'get_colaboradores', return_value=self.rows,
        ))
        self.lookup_rows = self.enterContext(patch.object(
            referidos, 'get_colaboradores', return_value=self.rows,
        ))
        self.get_owned = self.enterContext(patch.object(
            colaboradores, 'get_referidos', return_value=[{'id': 100}],
        ))
        self.read_refs = self.enterContext(patch.object(
            referidos, 'get_referidos', return_value=[{'id': 100}],
        ))
        self.edit_ref = self.enterContext(patch.object(
            colaboradores, 'editar_referido', return_value={'success': True},
        ))
        self.create_col = self.enterContext(patch.object(
            colaboradores, 'crear_colaborador',
            return_value={'success': True, 'id': 3, 'codigo_unico': 'SHEETS-CODE'},
        ))
        self.edit_col = self.enterContext(patch.object(
            colaboradores, 'editar_colaborador', return_value={'success': True},
        ))
        self.delete_col = self.enterContext(patch.object(
            colaboradores, 'eliminar_colaborador', return_value={'success': True},
        ))
        self.enterContext(patch(
            'requests.sessions.Session.request',
            side_effect=AssertionError('Las pruebas no deben llamar a Sheets'),
        ))
        self.payload = {'estado': 'Agendado', 'observaciones': 'Llamar pronto'}

    def request(self, method, url, code='OWN', data=None, **kwargs):
        return self.client.open(
            url, method=method,
            headers={'Authorization': f'Bearer {code}', **kwargs}, json=data,
        )

    def test_all_private_routes_require_authentication(self):
        for method, url in [
            ('GET', '/colaboradores'), ('POST', '/colaboradores'),
            ('PUT', '/colaboradores/2'), ('DELETE', '/colaboradores/2'),
            ('GET', '/colaboradores/OWN/referidos'), ('PUT', '/referidos/100'),
            ('GET', '/colaboradores/id/2/referidos'),
        ]:
            with self.subTest(method=method, url=url):
                self.assertEqual(self.client.open(url, method=method).status_code, 401)
        self.verify.assert_not_called()

    def test_invalid_code_is_rejected(self):
        self.assertEqual(self.request('GET', '/colaboradores', code='INVALID').status_code, 401)
        self.get_rows.assert_not_called()

    def test_admin_lists_all_collaborators(self):
        result = self.request('GET', '/colaboradores', code='ADMIN')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json, self.rows)

    def test_collaborator_reads_full_directory_without_foreign_codes(self):
        result = self.request('GET', '/colaboradores')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json, [
            self.rows[0],
            {'id': 2, 'nombre': 'Otro colaborador'},
        ])

    def test_directory_never_exposes_alternative_credentials(self):
        self.rows[1].update({'codigo': 'OTHER', 'token': 'private-token'})
        result = self.request('GET', '/colaboradores')
        self.assertEqual(result.status_code, 200)
        self.assertNotIn('codigo_unico', result.json[1])
        self.assertNotIn('codigo', result.json[1])
        self.assertNotIn('token', result.json[1])

    def test_owner_reads_own_referrals(self):
        self.assertEqual(self.request('GET', '/colaboradores/OWN/referidos').status_code, 200)
        self.read_refs.assert_called_once_with('OWN')

    def test_foreign_credential_route_remains_restricted(self):
        self.assertEqual(self.request('GET', '/colaboradores/OTHER/referidos').status_code, 403)
        self.read_refs.assert_not_called()

    def test_all_roles_read_any_collaborator_referrals_by_public_id(self):
        for code in ['OWN', 'OTHER', 'ADMIN']:
            with self.subTest(code=code):
                result = self.request('GET', '/colaboradores/id/2/referidos', code=code)
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.json, [{'id': 100}])
                self.read_refs.assert_called_with('OTHER')

    def test_read_only_referrals_preserve_notes_without_exposing_credentials(self):
        self.read_refs.return_value = [{
            'id': 200, 'colaborador_id': 'OTHER', 'video_token': 'private-video',
            'codigo_unico': 'OTHER', 'token': 'private-token',
            'estado': 'Contactado', 'observaciones': 'Llamar pronto',
            'referido_nombre': 'Cliente',
        }]
        result = self.request('GET', '/colaboradores/id/2/referidos')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json, [{
            'id': 200, 'estado': 'Contactado', 'observaciones': 'Llamar pronto',
            'referido_nombre': 'Cliente',
        }])

    def test_unknown_collaborator_id_returns_not_found(self):
        self.assertEqual(self.request('GET', '/colaboradores/id/999/referidos').status_code, 404)
        self.read_refs.assert_not_called()

    def test_failed_public_id_lookup_returns_service_error(self):
        self.lookup_rows.side_effect = Timeout('Unavailable')
        self.assertEqual(self.request('GET', '/colaboradores/id/2/referidos').status_code, 502)
        self.read_refs.assert_not_called()

    def test_invalid_public_id_referrals_return_service_error(self):
        self.read_refs.return_value = {'error': 'Unexpected response'}
        self.assertEqual(self.request('GET', '/colaboradores/id/2/referidos').status_code, 502)

    def test_reading_foreign_referrals_does_not_grant_write_permission(self):
        self.read_refs.return_value = [{'id': 200}]
        self.assertEqual(self.request('GET', '/colaboradores/id/2/referidos').status_code, 200)
        self.assertEqual(self.request('PUT', '/referidos/200', data=self.payload).status_code, 403)
        self.edit_ref.assert_not_called()

    def test_admin_can_read_any_referrals(self):
        self.assertEqual(self.request('GET', '/colaboradores/OTHER/referidos', code='ADMIN').status_code, 200)
        self.read_refs.assert_called_once_with('OTHER')

    def test_owner_can_edit_own_referral(self):
        result = self.request('PUT', '/referidos/100', data=self.payload)
        self.assertEqual(result.status_code, 200)
        self.get_owned.assert_called_once_with('OWN')
        self.edit_ref.assert_called_once_with('100', 'Agendado', 'Llamar pronto')

    def test_forged_ownership_and_role_do_not_allow_foreign_edits(self):
        result = self.request(
            'PUT', '/referidos/200',
            data={**self.payload, 'colaborador_id': 'OWN', 'rol': 'admin'},
            **{'X-Colaborador-Codigo': 'ADMIN'},
        )
        self.assertEqual(result.status_code, 403)
        self.edit_ref.assert_not_called()

    def test_admin_can_edit_any_referral(self):
        result = self.request('PUT', '/referidos/200', code='ADMIN', data=self.payload)
        self.assertEqual(result.status_code, 200)
        self.get_owned.assert_not_called()
        self.edit_ref.assert_called_once_with('200', 'Agendado', 'Llamar pronto')

    def test_collaborators_cannot_modify_collaborator_records(self):
        for method, url in [
            ('POST', '/colaboradores'),
            ('PUT', '/colaboradores/1'), ('PUT', '/colaboradores/2'),
            ('DELETE', '/colaboradores/1'), ('DELETE', '/colaboradores/2'),
        ]:
            with self.subTest(method=method, url=url):
                self.assertEqual(self.request(method, url, data={'nombre': 'Test', 'email': 'test@example.com'}).status_code, 403)
        self.create_col.assert_not_called()
        self.edit_col.assert_not_called()
        self.delete_col.assert_not_called()

    def test_admin_retains_collaborator_crud(self):
        payload = {'nombre': 'Test', 'email': 'test@example.com'}
        for method, url in [('POST', '/colaboradores'), ('PUT', '/colaboradores/2'), ('DELETE', '/colaboradores/2')]:
            with self.subTest(method=method):
                self.assertEqual(self.request(method, url, code='ADMIN', data=payload).status_code, 200)

    def test_creation_returns_real_sheet_id_and_code_without_listing_again(self):
        result = self.request('POST', '/colaboradores', code='ADMIN', data={
            'nombre': ' Nueva persona ', 'email': ' nueva@example.com ',
        })
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['id'], 3)
        self.assertEqual(result.json['codigo_unico'], 'SHEETS-CODE')
        self.assertEqual(result.json['nombre'], 'Nueva persona')
        self.assertEqual(result.json['total_referidos'], 0)
        self.create_col.assert_called_once_with('Nueva persona', 'nueva@example.com')
        self.get_rows.assert_not_called()

    def test_creation_accepts_nested_saved_collaborator(self):
        self.create_col.return_value = {'success': True, 'colaborador': {
            'id': 9, 'codigo': 'REAL-CODE', 'nombre': 'Nueva', 'email': 'n@example.com',
        }}
        result = self.request('POST', '/colaboradores', code='ADMIN', data={
            'nombre': 'Nueva', 'email': 'n@example.com',
        })
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['id'], 9)
        self.assertEqual(result.json['codigo_unico'], 'REAL-CODE')
        self.get_rows.assert_not_called()

    def test_legacy_creation_resolves_saved_row_by_returned_code(self):
        self.create_col.return_value = {'success': True, 'codigo_unico': 'OTHER'}
        result = self.request('POST', '/colaboradores', code='ADMIN', data={
            'nombre': 'Otro colaborador', 'email': 'otro@example.com',
        })
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['id'], 2)
        self.assertEqual(result.json['codigo_unico'], 'OTHER')
        self.get_rows.assert_called_once()

    def test_legacy_creation_resolves_unique_saved_name_and_email(self):
        self.create_col.return_value = {'success': True}
        self.rows.append({'id': 8, 'nombre': 'Nueva', 'email': 'n@example.com', 'codigo_unico': 'REAL'})
        result = self.request('POST', '/colaboradores', code='ADMIN', data={
            'nombre': 'Nueva', 'email': 'n@example.com',
        })
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['id'], 8)
        self.assertEqual(result.json['codigo_unico'], 'REAL')

    def test_ambiguous_legacy_creation_never_invents_identity(self):
        self.create_col.return_value = {'success': True}
        self.rows.extend([
            {'id': 8, 'nombre': 'Nueva', 'email': 'n@example.com', 'codigo_unico': 'A'},
            {'id': 9, 'nombre': 'Nueva', 'email': 'n@example.com', 'codigo_unico': 'B'},
        ])
        result = self.request('POST', '/colaboradores', code='ADMIN', data={
            'nombre': 'Nueva', 'email': 'n@example.com',
        })
        self.assertEqual(result.status_code, 502)
        self.assertNotIn('codigo_unico', result.json)

    def test_creation_failures_do_not_report_success(self):
        for response in [{'success': False, 'error': 'No guardado'}, {}, None]:
            self.create_col.return_value = response
            with self.subTest(response=response):
                result = self.request('POST', '/colaboradores', code='ADMIN', data={
                    'nombre': 'Nueva', 'email': 'n@example.com',
                })
                self.assertEqual(result.status_code, 502)
        self.get_rows.assert_not_called()

    def test_creation_rejects_invalid_input_before_writing(self):
        for payload in [[], {}, {'nombre': 4, 'email': 'a@example.com'}, {'nombre': ' ', 'email': 'a@example.com'}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.request('POST', '/colaboradores', code='ADMIN', data=payload).status_code, 400)
        self.create_col.assert_not_called()

    def test_invalid_referral_data_never_reaches_sheets(self):
        for payload in [
            [], {}, {'estado': ['Agendado'], 'observaciones': ''},
            {'estado': 'Otro', 'observaciones': ''},
            {'estado': 'Vendido', 'observaciones': None},
            {'estado': 'Vendido', 'observaciones': 'x' * 5001},
        ]:
            with self.subTest(payload_type=type(payload).__name__):
                self.assertEqual(self.request('PUT', '/referidos/100', data=payload).status_code, 400)
        self.edit_ref.assert_not_called()

    def test_blank_state_and_notes_are_allowed(self):
        self.assertEqual(self.request('PUT', '/referidos/100', data={'estado': '', 'observaciones': ''}).status_code, 200)

    def test_failed_ownership_lookup_never_writes(self):
        self.get_owned.side_effect = Timeout('Unavailable')
        self.assertEqual(self.request('PUT', '/referidos/100', data=self.payload).status_code, 502)
        self.edit_ref.assert_not_called()

    def test_invalid_ownership_response_never_writes(self):
        self.get_owned.return_value = {'error': 'Unexpected response'}
        self.assertEqual(self.request('PUT', '/referidos/100', data=self.payload).status_code, 502)
        self.edit_ref.assert_not_called()

    def test_authentication_failure_returns_service_error(self):
        self.verify.side_effect = Timeout('Unavailable')
        self.assertEqual(self.request('GET', '/colaboradores').status_code, 502)
        self.get_rows.assert_not_called()


if __name__ == '__main__':
    unittest.main()
