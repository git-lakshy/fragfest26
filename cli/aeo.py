import sys
import argparse
import time
import urllib.request
import json
from typing import List, Optional

# Color constants
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_BLUE = "\033[34m"
COLOR_PURPLE = "\033[35m"
COLOR_CYAN = "\033[36m"
COLOR_RED = "\033[31m"

def print_header(title: str):
    print(f"\n{COLOR_BOLD}{COLOR_PURPLE}=== {title} ==={COLOR_RESET}\n")

def make_request(api_url: str, endpoint: str, method: str = "GET", data: Optional[dict] = None) -> dict:
    url = f"{api_url}/{endpoint}"
    req_data = None
    
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"} if req_data else {},
        method=method
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"{COLOR_RED}{COLOR_BOLD}Connection Error:{COLOR_RESET} Could not connect to A-EYE Control Plane at {url}.")
        print("Please verify that the FastAPI backend server is running and accessible.")
        sys.exit(1)
    except Exception as e:
        print(f"{COLOR_RED}Request failed: {e}{COLOR_RESET}")
        sys.exit(1)

def run_scan(api_url: str, target_url: str, competitors: List[str]):
    print_header("A-EYE SWARM CRAWLER & EVALUATOR")
    print(f"{COLOR_CYAN}Target URL:{COLOR_RESET} {target_url}")
    if competitors:
        print(f"{COLOR_CYAN}Competitors:{COLOR_RESET} {', '.join(competitors)}")
    print(f"\n{COLOR_YELLOW}Triggering Nasiko swarm agents...{COLOR_RESET}")
    
    steps = [
        "Knowledge Ingestion Agent: structuring website...",
        "User Intent Agent: compiling user questions...",
        "AI Testing and Evaluation Agent: Vertex AI simulation...",
        "Competitor Intelligence Agent: processing rival sites...",
        "Content Gap Agent: finalizing score cards..."
    ]
    
    for step in steps:
        time.sleep(0.4)
        print(f" {COLOR_BLUE}*{COLOR_RESET} {step}")
        
    # Trigger scan API call
    payload = {"url": target_url, "competitors": competitors}
    result = make_request(api_url, "scan", method="POST", data=payload)
    
    score = result.get("overall_aeo_score", 0)
    success = result.get("question_success_rate", 0.0)
    trust = result.get("documentation_trust", 0.0)
    
    print(f"\n{COLOR_GREEN}{COLOR_BOLD}[OK] Scan successfully finished!{COLOR_RESET}\n")
    
    print(f"{COLOR_BOLD}--- SCORES ---{COLOR_RESET}")
    print(f"Overall A-EYE Score:      {COLOR_GREEN}{COLOR_BOLD}{score}%{COLOR_RESET}")
    print(f"User Intent Success:    {COLOR_CYAN}{success}%{COLOR_RESET}")
    print(f"Documentation Trust:    {COLOR_CYAN}{trust}%{COLOR_RESET}")
    print()
    
    print(f"{COLOR_BOLD}--- COMPETITOR BENCHMARK ---{COLOR_RESET}")
    for comp in result.get("competitors", []):
        score_bar = "#" * (comp["score"] // 5) + "-" * (20 - (comp["score"] // 5))
        is_target = comp["url"] == target_url
        color = COLOR_GREEN if is_target else COLOR_YELLOW
        print(f"{color}{comp['name']:<35} [{comp['score']:>3}%] |{score_bar}|{COLOR_RESET}")
        
    print(f"\n{COLOR_YELLOW}[INFO] Run 'aeo fix' to apply the swarm's recommended code fixes locally.{COLOR_RESET}")

def run_fix(api_url: str):
    print_header("A-EYE SWARM AUTOMATED REMEDIATION")
    print(f"{COLOR_YELLOW}Fetching pending gaps from the control plane...{COLOR_RESET}")
    
    metrics = make_request(api_url, "metrics")
    queue = metrics.get("remediation_queue", [])
    pending_fixes = [f for f in queue if f["status"] == "pending"]
    
    if not pending_fixes:
        print(f"\n{COLOR_GREEN}[OK] Codebase is fully optimized. No pending fixes in the swarm queue.{COLOR_RESET}")
        return
        
    print(f"\nFound {COLOR_BOLD}{len(pending_fixes)}{COLOR_RESET} pending gaps. Executing Remediation Agent...")
    
    for idx, fix in enumerate(pending_fixes):
        print(f"\n{COLOR_CYAN}Fix {idx+1}: {fix['title']}{COLOR_RESET}")
        print(f"Target File: {COLOR_YELLOW}{fix['file']}{COLOR_RESET}")
        print(f"Description: {fix['description']}")
        print(f"Agent:       {fix['agent']}")
        print(f"Proposed Diff:")
        
        for line in fix["diff"].split("\n"):
            if line.startswith("+"):
                print(f"{COLOR_GREEN}{line}{COLOR_RESET}")
            elif line.startswith("-"):
                print(f"{COLOR_RED}{line}{COLOR_RESET}")
            else:
                print(line)
                
        print(f"\n{COLOR_BLUE}Applying code changes to local file...{COLOR_RESET}")
        time.sleep(0.5)
        
        result = make_request(api_url, "fix", method="POST", data={"fix_id": fix["id"]})
        print(f"{COLOR_GREEN}{COLOR_BOLD}[OK] {result.get('message')}{COLOR_RESET}")
        print(f"Updated overall A-EYE Score: {COLOR_GREEN}{COLOR_BOLD}{result.get('updated_score')}%{COLOR_RESET}")

def run_status(api_url: str):
    print_header("A-EYE SYSTEM STATUS & AGENT REGISTRY")
    
    print(f"{COLOR_BOLD}Connecting to Control Plane...{COLOR_RESET}", end="", flush=True)
    metrics = make_request(api_url, "metrics")
    agents = make_request(api_url, "agents")
    print(f" {COLOR_GREEN}[CONNECTED]{COLOR_RESET}\n")
    
    # 1. System Health Metrics
    m = metrics.get("metrics", {})
    print(f"{COLOR_BOLD}=== Control Plane Health ==={COLOR_RESET}")
    print(f"Overall A-EYE Index:      {COLOR_GREEN}{m.get('overall_aeo_score', 0)}%{COLOR_RESET}")
    print(f"Question Success Rate:    {COLOR_CYAN}{m.get('question_success_rate', 0)}%{COLOR_RESET}")
    print(f"Documentation Trust:    {COLOR_CYAN}{m.get('documentation_trust', 0)}%{COLOR_RESET}")
    print(f"Total Evaluator Scans:  {m.get('total_scans_run', 0)}")
    
    # Gaps count
    queue = metrics.get("remediation_queue", [])
    pending = len([f for f in queue if f["status"] == "pending"])
    applied = len([f for f in queue if f["status"] == "applied"])
    print(f"Remediation Queue:      {COLOR_YELLOW}{pending} Pending{COLOR_RESET} | {COLOR_GREEN}{applied} Applied{COLOR_RESET}")
    
    # Github linking
    gh = metrics.get("github_config", {})
    linked = "YES" if (gh.get("owner") and gh.get("repo")) else "NO"
    print(f"GitHub Repository:      {COLOR_PURPLE}{linked}{COLOR_RESET} ({gh.get('owner')}/{gh.get('repo') if linked == 'YES' else 'Not Configured'})")
    print()
    
    # 2. Agent Registry
    print(f"{COLOR_BOLD}=== Nasiko Agent Registry ({len(agents)} Active) ==={COLOR_RESET}")
    print(f"{'Agent Name':<25} | {'Protocol':<8} | {'Transport':<10} | {'Capabilities'}")
    print("-" * 75)
    for agent in agents:
        caps = agent.get("capabilities", {})
        cap_str = []
        if caps.get("streaming"): cap_str.append("Stream")
        if caps.get("stateTransitionHistory"): cap_str.append("History")
        print(f"{COLOR_BLUE}{agent.get('name'):<25}{COLOR_RESET} | {agent.get('protocolVersion'):<8} | {agent.get('preferredTransport'):<10} | {', '.join(cap_str)}")
    print()

def run_history(api_url: str):
    print_header("A-EYE SCORE TREND HISTORY")
    
    metrics = make_request(api_url, "metrics")
    history = metrics.get("aeo_score_history", [])
    
    if not history:
        print(f"{COLOR_YELLOW}No historic scan evaluations registered in database.{COLOR_RESET}")
        return
        
    print(f"{COLOR_BOLD}Historical A-EYE score progress chart:{COLOR_RESET}\n")
    
    # Draw horizontal bar chart
    for entry in history:
        d = entry.get("date", "Unknown")
        s = entry.get("score", 0)
        
        # Build score bar
        bar_len = s // 4
        bar = "#" * bar_len + "-" * (25 - bar_len)
        
        print(f" {COLOR_CYAN}{d}{COLOR_RESET} | {COLOR_GREEN}{s:>3}%{COLOR_RESET} |{bar}|")
        
    print()

def main():
    parser = argparse.ArgumentParser(description="A-EYE Command Line Swarm Utility.")
    parser.add_argument("-p", "--port", type=int, default=8000, help="FastAPI server port (default: 8000)")
    parser.add_argument("-s", "--server", type=str, default=None, help="Custom FastAPI server URL (overrides port)")
    
    subparsers = parser.add_subparsers(dest="command", help="Swarm commands")
    
    # scan command
    scan_parser = subparsers.add_parser("scan", help="Initiate A-EYE simulation scan of target site.")
    scan_parser.add_argument("url", type=str, help="Target URL to optimization scan.")
    scan_parser.add_argument("--competitors", type=str, default="", help="Comma-separated competitor URLs.")
    
    # fix command
    subparsers.add_parser("fix", help="Approve and apply swarm-generated codebase fixes.")
    
    # status command
    subparsers.add_parser("status", help="Query agent capabilities registry and health metrics.")
    
    # history command
    subparsers.add_parser("history", help="Render score evaluation trends over time.")
    
    args = parser.parse_args()
    
    # Determine base url
    if args.server:
        api_url = args.server.rstrip("/")
    else:
        api_url = f"http://localhost:{args.port}/api"
        
    if args.command == "scan":
        competitors = [c.strip() for c in args.competitors.split(",") if c.strip()]
        run_scan(api_url, args.url, competitors)
    elif args.command == "fix":
        run_fix(api_url)
    elif args.command == "status":
        run_status(api_url)
    elif args.command == "history":
        run_history(api_url)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
