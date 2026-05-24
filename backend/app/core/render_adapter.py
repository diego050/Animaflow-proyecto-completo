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
