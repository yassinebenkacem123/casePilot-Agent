from typing import TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from app.tools.registry import registry


class AgentState(TypedDict, total=False):
    ticket_id: str
    run_id: str
    ticket: dict
    classification: dict
    priority: dict
    team: dict
    evidence: list[dict]
    draft: dict
    proposal: dict
    errors: list[str]


def run_analysis(db, ticket_id, run_id):
    tools = registry(db, ticket_id, run_id)

    def invoke(name, data):
        result = tools[name].invoke(data)
        if not result["success"]:
            raise ValueError(result["error"])
        return result["data"]

    def load(state):
        return {"ticket": invoke("get_ticket", {"ticket_id": ticket_id})}

    def classify(state):
        return {"classification": invoke("classify_request", {"ticket_id": ticket_id})}

    def policy(state):
        return {
            "priority": invoke("suggest_priority", {"ticket_id": ticket_id}),
            "team": invoke(
                "suggest_team",
                {"ticket_id": ticket_id, "intent": state["classification"]["intent"]},
            ),
        }

    def retrieve(state):
        ticket = state["ticket"]
        return {
            "evidence": invoke(
                "search_knowledge", {"query": ticket["subject"] + " " + ticket["description"]}
            )["evidence"]
        }

    def draft(state):
        return {
            "draft": invoke(
                "draft_response", {"ticket_id": ticket_id, "evidence": state["evidence"]}
            )
        }

    def propose(state):
        return {
            "proposal": invoke(
                "propose_ticket_update",
                {
                    "ticket_id": ticket_id,
                    "classification": state["classification"],
                    "priority": state["priority"]["priority"],
                    "team_id": state["team"]["team_id"],
                    "rationale": state["classification"]["rationale"]
                    + " "
                    + state["priority"]["rationale"],
                },
            )
        }

    def review(state):
        invoke("request_human_approval", state["proposal"])
        return {}

    builder = StateGraph(AgentState)
    steps = [
        ("load_ticket", load),
        ("classify", classify),
        ("verify_policy", policy),
        ("retrieve_context", retrieve),
        ("draft_reply", draft),
        ("persist_proposal", propose),
        ("queue_review", review),
    ]
    previous = START
    for name, fn in steps:
        builder.add_node(name, fn)
        builder.add_edge(previous, name)
        previous = name
    builder.add_edge(previous, END)
    graph = builder.compile(checkpointer=InMemorySaver())
    return graph.invoke(
        {"ticket_id": ticket_id, "run_id": run_id, "errors": []},
        {"recursion_limit": 12, "configurable": {"thread_id": f"{ticket_id}:{run_id}"}},
    )
