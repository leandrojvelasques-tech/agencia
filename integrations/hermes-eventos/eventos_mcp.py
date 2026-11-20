"""Read-only event MCP for Hermes, using its installed mcp 2.3.x SDK.

No database/admin credentials, registration writes, arbitrary URLs or file paths.
The website serves a projection of the already-public event; private course
materials stay on the Hermes host and are selected from an explicit inventory.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal
from urllib.request import Request, build_opener, HTTPRedirectHandler

EVENT_ID = "d9962e70-4b7a-44be-b6f3-20151c810bdb"
EVENT_SLUG = "agentes-de-inteligencia-artificial-en-ciencias-economicas-2026"
CONTEXT_URL = "https://www.leandrovelasques.com.ar/api/event-assistant-context"
KNOWLEDGE_DIR = Path(os.environ.get("EVENT_KNOWLEDGE_DIR", "/opt/data/profiles/asistente-eventos/workspace/conocimiento/cpce-2026-11-21"))
MaterialId = Literal["02", "03", "04", "05"]
MATERIALS = {
    "02": ("Del chat al trabajo con agentes", "02-del-chat-al-trabajo-con-agentes-v3"),
    "03": ("Qué son los agentes", "03-que-son-los-agentes-v3"),
    "04": ("Cuatro formas de trabajar con agentes de IA", "04-cuatro-formas-trabajar-agentes-ia-v6"),
    "05": ("Del chat a los agentes proactivos", "05-del-chat-a-los-agentes-proactivos-v4"),
}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_event_context() -> dict:
    """Always fetch current event data; never silently fall back to old data."""
    try:
        request = Request(CONTEXT_URL, headers={"Accept": "application/json", "User-Agent": "Leandro-Eventos-MCP/1.0"})
        with build_opener(NoRedirect).open(request, timeout=15) as response:
            if response.status != 200 or "application/json" not in response.headers.get("Content-Type", ""):
                raise ValueError("invalid response")
            raw = response.read(262145)
            if len(raw) > 262144:
                raise ValueError("response too large")
        context = json.loads(raw)
        event = context.get("event", {})
        if event.get("id") != EVENT_ID or event.get("slug") != EVENT_SLUG:
            raise ValueError("unexpected event")
        return context
    except Exception:
        raise ValueError("No pude consultar los datos vigentes del evento. No confirmes horarios, disponibilidad o inscripciones con información desactualizada.") from None


def material_path(material_id: str, image: bool = False) -> Path:
    if material_id not in MATERIALS:
        raise ValueError("Material no disponible. Usá list_event_materials para ver los identificadores permitidos.")
    suffix = "-1920x1080.png" if image else "-ficha.md"
    candidate = KNOWLEDGE_DIR / (MATERIALS[material_id][1] + suffix)
    root = KNOWLEDGE_DIR.resolve(strict=True)
    if candidate.is_symlink() or candidate.resolve(strict=True).parent != root or not candidate.is_file():
        raise ValueError("Material no disponible en la base de conocimiento.")
    if candidate.stat().st_size > (3145728 if image else 131072):
        raise ValueError("El material excede el tamaño permitido.")
    return candidate


def list_materials() -> dict:
    return {
        "event_id": EVENT_ID,
        "scope": "Cuatro diapositivas y sus fichas. No representa el curso completo ni habilita su distribución.",
        "materials": [{"id": key, "title": item[0], "text_available": _available(key), "slide_available": _available(key, True)} for key, item in MATERIALS.items()],
    }


def _available(material_id: str, image: bool = False) -> bool:
    try:
        material_path(material_id, image)
        return True
    except (ValueError, OSError):
        return False


def read_text(material_id: str) -> dict:
    try:
        text = material_path(material_id).read_text(encoding="utf-8-sig")
    except OSError:
        raise ValueError("No pude leer la ficha solicitada.") from None
    return {"id": material_id, "title": MATERIALS[material_id][0], "text": text,
            "source": "Ficha de la charla CPCE Chubut · 21/11/2026",
            "usage": "Referencia para explicar el encuentro. No publiques los archivos ni supongas que todos los productos mencionados fueron verificados externamente."}


def run_server():
    from mcp.server import MCPServer
    from mcp.server.mcpserver import Image
    from mcp.types import ToolAnnotations
    server = MCPServer("leandro-eventos")
    annotations = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False)

    @server.tool(annotations=annotations)
    def get_event_information() -> dict:
        """Consultar los datos vigentes del evento público en el backoffice: fecha, horario, contenidos, inscripción y presentation_url público. Compartir la presentación solo si la piden; no adjuntar archivos privados. No contiene asistentes."""
        return fetch_event_context()

    @server.tool(annotations=annotations)
    def list_event_materials() -> dict:
        """Listar las cuatro diapositivas y fichas privadas disponibles para explicar el evento. No es un catálogo de otros eventos."""
        return list_materials()

    @server.tool(annotations=annotations)
    def read_event_text(material_id: MaterialId) -> dict:
        """Leer una ficha de texto completa de la charla. Usar identificadores de list_event_materials."""
        return read_text(material_id)

    @server.tool(annotations=annotations)
    def view_event_slide(material_id: MaterialId):
        """Ver una diapositiva concreta para comprender el contenido visual. No distribuir imágenes al visitante."""
        return Image(path=str(material_path(material_id, True)))

    @server.tool(annotations=annotations)
    def get_registration_instructions() -> dict:
        """Consultar disponibilidad y enlace del formulario oficial. Esta herramienta no crea ni confirma inscripciones."""
        context = fetch_event_context()
        return {"event_title": context["event"]["title"], "fetched_at": context["fetched_at"], **context["registration"]}

    server.run(transport="stdio")


if __name__ == "__main__":
    run_server()
