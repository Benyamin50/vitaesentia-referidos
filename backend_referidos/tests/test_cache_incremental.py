import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import sheets_api
from requests import HTTPError


class SheetsIncrementalTests(unittest.TestCase):
    @patch.object(sheets_api.requests, 'get')
    def test_forwards_cursor_and_checks_http_status_before_json(self, get):
        response = get.return_value
        response.json.return_value = [{'id': 46}]
        self.assertEqual(sheets_api.get_referidos('OWN', 45), [{'id': 46}])
        get.assert_called_once_with(
            sheets_api.APPS_SCRIPT_URL,
            params={'action': 'getReferidos', 'colaborador_id': 'OWN', 'ultimo_id': 45},
            timeout=10,
        )
        response.raise_for_status.assert_called_once()

    @patch.object(sheets_api.requests, 'get')
    def test_default_zero_still_reads_all_rows_for_permission_checks(self, get):
        get.return_value.json.return_value = []
        self.assertEqual(sheets_api.get_referidos('OWN'), [])
        self.assertEqual(get.call_args.kwargs['params']['ultimo_id'], 0)

    @patch.object(sheets_api.requests, 'get')
    def test_failed_upstream_is_not_an_empty_increment(self, get):
        get.return_value.raise_for_status.side_effect = HTTPError('Failure')
        with self.assertRaises(HTTPError):
            sheets_api.get_referidos('OWN', 45)
        get.return_value.json.assert_not_called()
