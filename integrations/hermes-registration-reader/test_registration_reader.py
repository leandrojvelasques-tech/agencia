import json
import os
import unittest
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError
import registration_reader as client
import registration_mcp as private_mcp

TOKEN = "fictional_test_credential_000000000000000000000000"


class ReaderTests(unittest.TestCase):
    @patch.dict(os.environ, {"HERMES_CPCE_REGISTRATION_TOKEN": TOKEN})
    @patch.object(client, "build_opener")
    def test_fixed_get_and_credential_header(self, opener):
        response = MagicMock(status=200, headers={"Content-Type": "application/json"})
        response.read.return_value = b'{"cutoff":"2026-11-18T11:00:00.000000Z","total":0}'
        opener.return_value.open.return_value.__enter__.return_value = response
        result = client.read_registrations("total")
        request = opener.return_value.open.call_args.args[0]
        self.assertEqual(request.full_url, client.ENDPOINT + "?operation=total")
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.headers["Authorization"], "Bearer " + TOKEN)
        self.assertNotIn(TOKEN, request.full_url)
        self.assertEqual(result["total"], 0)

    @patch.dict(os.environ, {"HERMES_CPCE_REGISTRATION_TOKEN": TOKEN})
    @patch.object(client, "build_opener")
    def test_errors_never_include_source_body_or_credential(self, opener):
        for status in [301, 400, 401, 403, 410, 429, 503]:
            opener.return_value.open.side_effect = HTTPError(client.ENDPOINT, status, TOKEN + " private@example.invalid", {}, None)
            with self.assertRaises(ValueError) as caught:
                client.read_registrations("total")
            self.assertNotIn(TOKEN, str(caught.exception))
            self.assertNotIn("private@example.invalid", str(caught.exception))

    @patch.dict(os.environ, {}, clear=True)
    @patch.object(client, "build_opener")
    def test_no_network_without_credential(self, opener):
        with self.assertRaises(ValueError):
            client.read_registrations("total")
        opener.assert_not_called()

    def test_redirects_are_blocked(self):
        self.assertIsNone(client.NoRedirect().redirect_request(None, None, 302, None, None, "https://other.invalid"))

    @patch.dict(os.environ, {"HERMES_HOME": "/opt/data/profiles/asistente-eventos"})
    def test_public_profile_cannot_load_private_adapter(self):
        with self.assertRaises(ValueError):
            private_mcp.load_private_credential()


if __name__ == "__main__":
    unittest.main()
