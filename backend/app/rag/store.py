"""Isolated local vector adapter. Hash embeddings are deterministic demo retrieval."""

import hashlib
import math
import re
from typing import Protocol

from sqlalchemy import select

from app.models.entities import KnowledgeChunk, KnowledgeDocument
from app.schemas.tickets import StrictModel

STOP = {
    "the",
    "a",
    "an",
    "to",
    "of",
    "and",
    "is",
    "my",
    "i",
    "for",
    "with",
    "can",
    "you",
    "me",
    "how",
    "please",
    "our",
    "we",
    "it",
    "in",
    "on",
    "this",
    "what",
    "are",
}


class Evidence(StrictModel):
    chunk_id: str
    document_id: str
    title: str
    source: str
    snippet: str
    version: int


def terms(text):
    return set(re.findall(r"[a-z]{3,}", text.lower())) - STOP


def embed(text):
    vector = [0.0] * 256
    for word in terms(text):
        digest = hashlib.sha256(word.encode()).digest()
        vector[int.from_bytes(digest[:2]) % len(vector)] += 1.0
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


class KnowledgeStore(Protocol):
    def search(self, query: str, document_ids: list[str] | None = None) -> list[Evidence]: ...


class LocalVectorStore:
    def __init__(self, db):
        self.db = db

    def ingest(self, document_id, title, source, content, version=1):
        """Admin/CLI ingestion only. No agent tool can write knowledge."""
        doc = self.db.get(KnowledgeDocument, document_id)
        if doc and doc.version == version:
            return
        if doc:
            doc.title, doc.source, doc.content, doc.version = title, source, content, version
            for chunk in self.db.scalars(
                select(KnowledgeChunk).where(KnowledgeChunk.document_id == document_id)
            ):
                self.db.delete(chunk)
            self.db.flush()
        else:
            self.db.add(
                KnowledgeDocument(
                    id=document_id, title=title, source=source, content=content, version=version
                )
            )
            self.db.flush()
        for index, part in enumerate(content.split("\n\n")):
            self.db.add(
                KnowledgeChunk(
                    id=f"{document_id}:v{version}:{index}",
                    document_id=document_id,
                    content=part,
                    embedding=embed(part),
                    version=version,
                )
            )
        self.db.flush()

    def search(self, query, document_ids=None):
        # No overlap or policy gaps must not turn into fabricated promises.
        if terms(query) & {"refund", "sla", "guarantee", "compensation", "deadline"}:
            return []
        vector = embed(query)
        candidates = []
        for chunk, doc in self.db.execute(
            select(KnowledgeChunk, KnowledgeDocument).join(KnowledgeDocument)
        ):
            if document_ids is not None and doc.id not in document_ids:
                continue
            if not (terms(query) & terms(chunk.content)):
                continue
            score = sum(a * b for a, b in zip(vector, chunk.embedding, strict=True))
            if score >= 0.12:
                candidates.append((score, chunk, doc))
        candidates.sort(key=lambda item: (-item[0], item[1].id))
        return [
            Evidence(
                chunk_id=c.id,
                document_id=d.id,
                title=d.title,
                source=d.source,
                snippet=c.content,
                version=c.version,
            )
            for _, c, d in candidates[:3]
        ]

    def validate(self, evidence: list[Evidence]) -> list[Evidence]:
        verified = []
        for item in evidence:
            chunk = self.db.get(KnowledgeChunk, item.chunk_id)
            doc = self.db.get(KnowledgeDocument, item.document_id)
            if (
                not chunk
                or not doc
                or chunk.document_id != doc.id
                or chunk.version != item.version
                or chunk.content != item.snippet
                or doc.source != item.source
                or doc.title != item.title
            ):
                raise ValueError("CITATION_INVALID")
            verified.append(item)
        return verified


def grounded_reply(evidence: list[Evidence]):
    if not evidence:
        return "Thank you for your request. I do not have sufficient verified knowledge to answer this question. A support operator needs to review the details. No refund, resolution date, or SLA commitment is confirmed."
    # Only versioned, admin-ingested excerpts are rendered. No freeform model policy claims.
    excerpts = "\n\n".join(f"{item.snippet} [{item.chunk_id}]" for item in evidence)
    return f"Thank you for contacting support. Our verified support guide says:\n\n{excerpts}\n\nA support operator will review this draft before any customer communication."
