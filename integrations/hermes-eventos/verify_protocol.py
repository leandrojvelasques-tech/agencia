"""Run on the Hermes host with its existing mcp 2.3.x environment."""
import asyncio
import json
import sys
from pathlib import Path
from mcp import Client, StdioServerParameters


async def main():
    server = StdioServerParameters(command=sys.executable, args=[str(Path(__file__).with_name("eventos_mcp.py"))])
    async with Client(server) as client:
        listing = await client.list_tools()
        expected = {"get_event_information", "list_event_materials", "read_event_text", "view_event_slide", "get_registration_instructions"}
        assert {tool.name for tool in listing.tools} == expected
        assert all(tool.annotations.read_only_hint for tool in listing.tools)
        event = await client.call_tool("get_event_information", {})
        assert not event.is_error, "Live event read failed"
        assert event.structured_content["event"]["id"] == "d9962e70-4b7a-44be-b6f3-20151c810bdb"
        assert not any(key in json.dumps(event.structured_content) for key in ["private_link_token", "participant_id", "notification_recipients"])
        materials = await client.call_tool("list_event_materials", {})
        assert not materials.is_error
        assert len(materials.structured_content["materials"]) == 4
        assert all(item["text_available"] and item["slide_available"] for item in materials.structured_content["materials"])
        text = await client.call_tool("read_event_text", {"material_id": "03"})
        assert not text.is_error and "arnés" in text.structured_content["text"]
        image = await client.call_tool("view_event_slide", {"material_id": "03"})
        assert not image.is_error and any(item.type == "image" for item in image.content)
        registration = await client.call_tool("get_registration_instructions", {})
        assert not registration.is_error and registration.structured_content["url"].endswith("/inscripcion")
        invalid = await client.call_tool("read_event_text", {"material_id": "../config.yaml"})
        assert invalid.is_error
        write = await client.call_tool("register_participant", {})
        assert write.is_error
        print(json.dumps({"verified": True, "tools": sorted(expected), "event_title": event.structured_content["event"]["title"], "fetched_at": event.structured_content["fetched_at"], "materials": 4, "image_verified": True, "path_traversal_rejected": True, "registration_writes_unavailable": True}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
