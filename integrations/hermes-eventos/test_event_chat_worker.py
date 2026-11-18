import unittest
from event_chat_worker import allowed, verify_inventory, final_answer, TOOLS, EVENT_ID, signing_message


class WorkerTests(unittest.TestCase):
    def test_runtime_and_terminal_failures(self):
        data = {'choices': [{'finish_reason': 'stop', 'message': {'content': 'Respuesta'}}]}
        self.assertEqual(final_answer(data), 'Respuesta')
        with self.assertRaises(RuntimeError):
            final_answer({**data, 'runtime': {'provider': 'openai', 'model': 'gpt-6-luna'}})
        for reason in ('cancelled', 'error'):
            with self.assertRaises(RuntimeError):
                final_answer({'choices': [{'finish_reason': reason, 'message': {'content': 'Texto parcial'}}]})

    def test_date_and_preview(self):
        job = {'event_id': EVENT_ID, 'preview': False}
        self.assertFalse(allowed(job, '2026-11-20'))
        self.assertTrue(allowed(job, '2026-11-21'))
        self.assertFalse(allowed(job, '2026-11-22'))
        job['preview'] = True
        self.assertTrue(allowed(job, '2026-11-20'))
        self.assertFalse(allowed(job, '2026-11-22'))
        self.assertFalse(allowed({**job, 'event_id': 'other'}, '2026-11-21'))

    def test_toolsets_fail_closed(self):
        verify_inventory([{'name': 'mcp-leandro-eventos', 'enabled': True, 'tools': list(TOOLS)}])
        verify_inventory({'data': [{'name': 'mcp-leandro-eventos', 'enabled': True, 'tools': ['mcp__leandro_eventos__' + name for name in TOOLS]}]})
        verify_inventory([{'name': 'core', 'enabled': False, 'tools': ['terminal']}])
        for rows in [None, [{'name': 'core', 'enabled': True, 'tools': ['terminal']}],
                     [{'name': 'mcp-leandro-eventos', 'enabled': True, 'tools': ['read_file']}]]:
            with self.assertRaises(RuntimeError):
                verify_inventory(rows)

    def test_signature_binds_payload_and_nonce(self):
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
        from cryptography.exceptions import InvalidSignature
        key = Ed25519PrivateKey.generate()
        message = signing_message(b'{}', '1795260000', 'a' * 32)
        signature = key.sign(message)
        key.public_key().verify(signature, message)
        with self.assertRaises(InvalidSignature):
            key.public_key().verify(signature, signing_message(b'{"changed":true}', '1795260000', 'a' * 32))


if __name__ == '__main__':
    unittest.main()
