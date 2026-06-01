import os
import httpx
from typing import Dict, Any, List

class RenderAdapter:
    def __init__(self, render_server_url: str = "http://render-server:3001"):
        self.render_server_url = render_server_url

    async def render(self, job_id: str, scenes: List[Dict[str, Any]], aspect_ratio: str, mode: str = "local") -> Dict[str, Any]:
        """
        Sends a render request to the appropriate render server.
        """
        if mode == "local":
            # Convert relative audio URLs to absolute URLs pointing to the API server
            api_base_url = os.getenv("API_BASE_URL", "http://api:8000")
            for scene in scenes:
                audio_url = scene.get("audio_url")
                if audio_url and audio_url.startswith("/"):
                    scene["audio_url"] = f"{api_base_url}{audio_url}"

            async with httpx.AsyncClient() as client:
                try:
                    payload = {
                        "jobId": job_id,
                        "scenes": scenes,
                        "aspectRatio": aspect_ratio
                    }
                    response = await client.post(
                        f"{self.render_server_url}/render",
                        json=payload,
                        timeout=600.0  # Large timeout since rendering can take a while
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    return {
                        "success": True,
                        "video_url": data.get("mp4"),
                        "durationInFrames": data.get("durationInFrames")
                    }
                except Exception as e:
                    return {
                        "success": False,
                        "error": str(e)
                    }
                    
        elif mode == "lambda":
            raise NotImplementedError("Lambda rendering mode is not yet implemented.")
            
        else:
            return {
                "success": False,
                "error": f"Unknown render mode: {mode}"
            }
