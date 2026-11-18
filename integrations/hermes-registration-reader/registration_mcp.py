"""Two private read tools using Hermes' already-installed MCP SDK. No ports.

This adapter is separate from the event's public assistant and must only run
in the default private Hermes profile. Credentials stay in a protected file.
"""
import os
from pathlib import Path
from registration_reader import read_registrations

PRIVATE_HOME = Path('/opt/data')
CREDENTIAL_FILE = PRIVATE_HOME / 'secrets/cpce-registration-reader/credential.env'


def load_private_credential():
    home = Path(os.environ.get('HERMES_HOME', '')).resolve()
    if home != PRIVATE_HOME:
        raise ValueError('Esta herramienta sólo está habilitada en el Hermes privado principal.')
    if CREDENTIAL_FILE.is_symlink() or CREDENTIAL_FILE.stat().st_mode & 0o077:
        raise ValueError('La credencial privada debe conservar permisos exclusivos del propietario.')
    key, value = CREDENTIAL_FILE.read_text(encoding='utf-8').strip().split('=', 1)
    if key != 'HERMES_CPCE_REGISTRATION_TOKEN':
        raise ValueError('Configuración privada no válida.')
    os.environ[key] = value


def run_server():
    load_private_credential()
    from mcp.server import MCPServer
    from mcp.types import ToolAnnotations
    server = MCPServer('cpce-registration-reader')
    annotations = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False)

    @server.tool(annotations=annotations)
    def get_cpce_registration_total(cutoff: str | None = None) -> dict:
        """Consultar el total vigente de inscripciones del evento CPCE Chubut 21/11/2026. Incluye canceladas, como el panel. cutoff opcional en UTC Z; no accede a otros eventos."""
        return read_registrations('total', cutoff=cutoff)

    @server.tool(annotations=annotations)
    def get_cpce_registration_changes(from_time: str | None = None, cutoff: str | None = None, cursor: str | None = None, limit: int = 100) -> dict:
        """Leer inscripciones nuevas del evento CPCE Chubut 21/11/2026: nombre, apellido, profesión, ciudad y correo. Primera página requiere from_time UTC Z; cutoff es exclusivo. Para continuar, usar sólo cursor y limit, sin fechas. Seguir next_cursor hasta null. No escribe ni envía reportes."""
        return read_registrations('changes', from_time=from_time, cutoff=cutoff, cursor=cursor, limit=limit)

    server.run(transport='stdio')


if __name__ == '__main__':
    run_server()
