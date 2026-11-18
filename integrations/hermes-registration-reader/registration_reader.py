"""Private Hermes CLI adapter. No MCP server, state, scheduler or mail sender.

Token is read from the private process environment, never command arguments.
All HTTP errors are sanitized; no redirects or arbitrary URLs are accepted.
"""
import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

ENDPOINT = "https://www.leandrovelasques.com.ar/api/event-registration-reader"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_registrations(operation="changes", *, from_time=None, cutoff=None, cursor=None, limit=None):
    token = os.environ.get("HERMES_CPCE_REGISTRATION_TOKEN", "")
    if not 43 <= len(token) <= 128 or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in token):
        raise ValueError("Falta configurar la credencial privada de lectura.")
    if operation not in ("changes", "total"):
        raise ValueError("Operación no permitida.")
    params = {"operation": operation}
    params.update({key: value for key, value in {"from": from_time, "cutoff": cutoff, "cursor": cursor, "limit": limit}.items() if value is not None})
    request = Request(ENDPOINT + "?" + urlencode(params), headers={
        "Authorization": "Bearer " + token, "Accept": "application/json",
        "User-Agent": "Hermes-Private-CPCE-Reader/1.0",
    })
    try:
        with build_opener(NoRedirect).open(request, timeout=20) as response:
            if response.status != 200 or "application/json" not in response.headers.get("Content-Type", ""):
                raise ValueError("Respuesta no válida de la API privada.")
            raw = response.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError("Respuesta demasiado extensa.")
        return json.loads(raw)
    except HTTPError as error:
        messages = {400: "Parámetros o cursor no válidos.", 401: "Falta credencial.", 403: "Acceso revocado, vencido o no autorizado.",
                    410: "La captura venció. Repetí el intervalo completo y eliminá duplicados por id.",
                    429: "Límite temporal alcanzado. Reintentá después de 60 segundos.",
                    503: "Fuente no disponible o integración pendiente de configurar."}
        raise ValueError(messages.get(error.code, "La API privada no pudo completar la consulta.")) from None
    except (URLError, TimeoutError, OSError, json.JSONDecodeError):
        raise ValueError("No se pudo consultar la API privada. Conservá el último corte confirmado.") from None


def main():
    parser = argparse.ArgumentParser(description="Lectura privada de inscripciones CPCE 21/11/2026")
    parser.add_argument("operation", choices=["changes", "total"])
    parser.add_argument("--from", dest="from_time")
    parser.add_argument("--cutoff")
    parser.add_argument("--cursor")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    try:
        print(json.dumps(read_registrations(**vars(args)), ensure_ascii=False))
        return 0
    except ValueError as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
