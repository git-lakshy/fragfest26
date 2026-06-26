import os
import json
import logging
import urllib.parse
from typing import List, Dict, Any
import httpx
from bs4 import BeautifulSoup
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

logger = logging.getLogger(__name__)

# Verify API key availability
API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("VERTEX_API_KEY")

def is_api_configured() -> bool:
    return bool(API_KEY)

# Real dynamic HTTP crawler for Ingestion Agent
def crawl_website(url: str) -> Dict[str, Any]:
    logger.info(f"Crawling URL: {url}")
    try:
        headers = {"User-Agent": "A-EYE Crawler Swarm/1.0"}
        # Fetch target domain
        with httpx.Client(follow_redirects=True, timeout=10) as client:
            r = client.get(url, headers=headers)
            
        if r.status_code != 200:
            return {"error": f"HTTP {r.status_code} Error", "url": url, "status": "failed"}
            
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Extract title
        title = soup.title.string.strip() if soup.title else "Untitled Page"
        
        # Extract text content
        paragraphs = [p.text.strip() for p in soup.find_all("p") if p.text.strip()]
        full_text = " ".join(paragraphs[:15]) # Limit content size
        
        # Check for JSON-LD schemas
        json_ld_schemas = []
        for script in soup.find_all("script", type="application/ld+json"):
            if script.string:
                try:
                    json_ld_schemas.append(json.loads(script.string.strip()))
                except Exception:
                    pass
                    
        # Check for structured tables
        tables = soup.find_all("table")
        
        # Check headings structure
        headings = [h.text.strip() for h in soup.find_all(["h1", "h2", "h3"]) if h.text.strip()]
        
        return {
            "url": url,
            "title": title,
            "headings_count": len(headings),
            "headings_list": headings[:6],
            "text": full_text[:2000],
            "json_ld_present": len(json_ld_schemas) > 0,
            "json_ld_count": len(json_ld_schemas),
            "tables_count": len(tables),
            "word_count": len(full_text.split()),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error crawling {url}: {e}")
        return {"error": str(e), "url": url, "status": "failed"}

# Heuristic A-EYE Evaluation Engine for offline fallback
def evaluate_aeo_heuristics(scraped_data: Dict[str, Any]) -> Dict[str, Any]:
    if scraped_data.get("status") == "failed":
        return {
            "overall_score": 45,
            "confidence": 40,
            "hallucination_risk": 75,
            "trust": 42,
            "gaps": [
                "Target URL could not be crawled. Verification of metadata schemas failed.",
                "Missing structured schema metadata headers."
            ],
            "questions": [
                "What product features does this site offer?",
                "How do I configure this application?",
                "What are the deployment requirements?",
                "Is there an API guide?",
                "Who provides this service?"
            ]
        }
        
    overall_score = 55
    confidence = 58
    hallucination_risk = 50
    trust = 52
    gaps = []
    
    # 1. Schema check
    if scraped_data.get("json_ld_present", False):
        overall_score += 15
        confidence += 12
        hallucination_risk -= 15
        trust += 15
    else:
        gaps.append("Missing JSON-LD structured schema headers on the landing page.")
        
    # 2. Structured tables check
    if scraped_data.get("tables_count", 0) > 0:
        overall_score += 12
        confidence += 10
        hallucination_risk -= 10
        trust += 8
    else:
        gaps.append("API parameters and documentation are unstructured (missing markdown tables).")
        
    # 3. Content depth checks
    word_cnt = scraped_data.get("word_count", 0)
    if word_cnt > 300:
        overall_score += 10
        trust += 10
        confidence += 5
    elif word_cnt < 80:
        overall_score -= 15
        trust -= 15
        confidence -= 10
        gaps.append("Thin copy detected. Product specifications lack sufficient context for LLM answer retrieval.")
        
    # 4. Heading structures
    if scraped_data.get("headings_count", 0) < 3:
        overall_score -= 5
        gaps.append("Unstructured heading outline. AI engines cannot map content hierarchies.")
        
    # Normalize score boundaries
    overall_score = max(25, min(96, overall_score))
    confidence = max(25, min(95, confidence))
    hallucination_risk = max(10, min(85, hallucination_risk))
    trust = max(25, min(95, trust))
    
    # Generate realistic dynamic questions based on crawled page headings or title
    title = scraped_data.get("title", "this product")
    headings = scraped_data.get("headings_list", [])
    
    questions = []
    if headings:
        for h in headings[:4]:
            questions.append(f"What details are provided about '{h}'?")
    questions.append(f"What is the main objective of {title}?")
    while len(questions) < 5:
        questions.append(f"How can I integrate or use the features on {title}?")
    questions = questions[:5]
    
    return {
        "overall_score": overall_score,
        "confidence": confidence,
        "hallucination_risk": hallucination_risk,
        "trust": trust,
        "gaps": gaps if gaps else ["No major content optimization gaps detected."],
        "questions": questions
    }

# Scaffolding Agents with instructions matching PRD
def create_ingestion_agent() -> Agent:
    return Agent(
        name="IngestionAgent",
        model="gemini-2.5-flash",
        instruction="""
        You are the Knowledge Ingestion Agent. Your task is to scrape and structure a target website's documentation and landing pages.
        Extract text, titles, headings, structural hierarchy, metadata, and JSON-LD schema objects if any.
        """
    )

def create_user_intent_agent() -> Agent:
    return Agent(
        name="UserIntentAgent",
        model="gemini-2.5-flash",
        instruction="""
        You are the User Intent Agent. Your task is to analyze target website data and generate a list of 5 realistic queries or questions that users would search or ask an AI answer engine about this product, API, or service.
        """
    )

def create_evaluation_agent() -> Agent:
    return Agent(
        name="EvaluationAgent",
        model="gemini-2.5-flash",
        instruction="""
        You are the AI Testing and Evaluation Agent. Your task is to simulate answering the generated questions using the target website content.
        Provide a detailed answer and score the performance on three parameters (0 to 100):
        1. Confidence: How confident is the AI in the answer based on the source text?
        2. Hallucination Risk: Is the AI forced to guess/hallucinate details not in the source text?
        3. Missing Info: Are there crucial details missing from the source text needed for a complete answer?
        """
    )

def create_competitor_agent() -> Agent:
    return Agent(
        name="CompetitorAgent",
        model="gemini-2.5-flash",
        instruction="""
        You are the Competitor Intelligence Agent. Perform AEO analysis on competitor websites, simulating search engine answers and generating scores for comparison.
        """
    )

def create_content_gap_agent() -> Agent:
    return Agent(
        name="ContentGapAgent",
        model="gemini-2.5-flash",
        instruction="""
        You are the Content Gap Agent. Analyze the evaluation scores and identify concrete optimization gaps, such as missing JSON-LD schemas, unstructured API guides, or bad keyword placement.
        """
    )

def create_remediation_agent() -> Agent:
    return Agent(
        name="RemediationAgent",
        model="gemini-2.5-flash",
        instruction="""
        You are the Remediation Architect Agent. Analyze the local codebase files or content gap report, and output exact code or markdown additions to patch the gaps (e.g. JSON-LD scripts, structured API tables).
        """
    )

# Execution Helpers
async def run_agent_workflow(agent: Agent, prompt: str) -> str:
    if not is_api_configured():
        logger.warning(f"No API key provided. Falling back to mock logic for agent {agent.name}")
        raise ValueError("No API key provided")
        
    session_service = InMemorySessionService()
    runner = Runner(agent=agent, session_service=session_service, app_name="aEye_platform", auto_create_session=True)
    
    msg = types.Content(role="user", parts=[types.Part(text=prompt)])
    events_generator = runner.run(user_id="user_id", session_id="session_id", new_message=msg)
    
    text_parts = []
    for event in events_generator:
        if event.error_message:
            raise Exception(event.error_message)
        if event.message and event.message.parts:
            for part in event.message.parts:
                if part.text:
                    text_parts.append(part.text)
        elif event.content and hasattr(event.content, "parts"):
            for part in event.content.parts:
                if part.text:
                    text_parts.append(part.text)
                    
    return "".join(text_parts)
