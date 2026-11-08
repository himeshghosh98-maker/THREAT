"""Fixed SDK destinations. The application owns retries and validates each response."""
from app.core.config import Settings


async def request_json(settings: Settings, system: str, prompt: str, schema: dict) -> str:
    key = settings.provider_key.get_secret_value()
    model = settings.provider_model
    if settings.llm_provider == "anthropic":
        from anthropic import AsyncAnthropic

        async with AsyncAnthropic(api_key=key, base_url="https://api.anthropic.com",
                                  timeout=15, max_retries=0) as client:
            reply = await client.messages.create(model=model, max_tokens=1400, system=system,
                messages=[{"role": "user", "content": prompt}],
                output_config={"format": {"type": "json_schema", "schema": schema}})
            return "".join(block.text for block in reply.content if block.type == "text")
    if settings.llm_provider == "openai":
        from openai import AsyncOpenAI

        async with AsyncOpenAI(api_key=key, base_url="https://api.openai.com/v1",
                               timeout=15, max_retries=0) as client:
            reply = await client.responses.create(model=model, instructions=system, input=prompt,
                store=False, max_output_tokens=1400, text={"format": {"type": "json_schema",
                "name": "explanation", "schema": schema, "strict": True}})
            return reply.output_text

    from google import genai
    from google.genai import types

    options = types.HttpOptions(base_url="https://generativelanguage.googleapis.com", timeout=15000,
                                retry_options=types.HttpRetryOptions(attempts=1))
    async with genai.Client(api_key=key, vertexai=False, http_options=options).aio as client:
        reply = await client.models.generate_content(model=model, contents=prompt,
            config=types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json",
                                               response_json_schema=schema, max_output_tokens=1400))
        return reply.text or ""
