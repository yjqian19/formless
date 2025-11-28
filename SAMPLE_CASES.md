# Sample Use Cases

- Job Application Forms (ashbyhq)
- Event Registration Forms (Google Forms)
- Later: Online Exam (Google Forms)

## Core

**Simple Fill**
- Your LinkedIn Profile
  - A: www.linkedin.com/in/yjqian19
  - Item:
    - intent: linkedin profile
    - value: www.linkedin.com/in/yjqian19
    - type: text

**Incosistent question phrasing**
- What's your coolest project? / What's your proudest project? / Please describe a project that you built that you are most proud of.
  - A: "At a legal AI startup, I built the backend from 0→1, designing the database tables and 20+ type-safe APIs, and setting up CD pipeline for AWS deployment. I also built an async multi-agent component that reduced LLM processing time from 150s to 28s. The product is now preparing for its first pilot."
  - Item:
    - intent: proudest project experience
    - value: "At a legal AI startup, I built the backend from 0→1, designing the database tables and 20+ type-safe APIs, and setting up CD pipeline for AWS deployment. I also built an async multi-agent component that reduced LLM processing time from 150s to 28s. The product is now preparing for its first pilot."
    - type: text

**Short-term customed prompt and context + Inline Edit**
- Why do you want to work at [Company Name]?

  **Way 1: Using existing memory (prompt template) + user input context**
  - A: "1. I'm motivated by bringing AI into real workflows to create business value, and Formless's mission aligns well with the kind of work I want to do. 2. I enjoy hands-on coding and have built AI-powered products in a startup setting—from 0→1 to performance tuning—and this is the type of technical work I have experience with and want to go deeper into. 3. Formless has an energetic team with high tech bars, I can learn a lot and grow rapidly here"
  - Item (Long-term memory):
    - intent: "why join company"
    - value: "1. I'm motivated by bringing AI into real workflows to create business value, and {company name}'s mission aligns well with the kind of work I want to do. 2. I enjoy hands-on coding and have built AI-powered products in a startup setting—from 0→1 to performance tuning—and this is the type of technical work I have experience with and want to go deeper into. 3. {company_name} has an energetic team with high tech bars, I can learn a lot and grow rapidly here"
    - type: "prompt"
  - Item (Short-term context):
    - Company's introduction

  **Way 2: Using Inline Edit (user provides framework, AI generates)**
  - User input (framework/outline): "Reason 1: mission alignment - AI in workflows, Reason 2: technical fit - hands-on coding, startup experience, Reason 3: team/culture - energetic team, learning opportunity"
  - A: "1. I'm motivated by bringing AI into real workflows to create business value, and [Company Name]'s mission aligns well with the kind of work I want to do. 2. I enjoy hands-on coding and have built AI-powered products in a startup setting—from 0→1 to performance tuning—and this is the type of technical work I have experience with and want to go deeper into. 3. [Company Name] has an energetic team with high tech bars, I can learn a lot and grow rapidly here"
  - Item (Long-term memory, if available - optional):
    - intent: "why join company" (template/prompt for reference)
    - value: template with {company name} placeholder
    - type: "prompt"
  - Item (Short-term context):
    - Company's introduction (for context enrichment)
  - User provides: framework/outline as short-term prompt (primary input)

**Document based memory**
- According to the lecture slides, what are the three key characteristics of Impressionist painting?
  - A: "Based on the lecture materials (Lecture 5 on 19th Century Art): 1) Emphasis on capturing fleeting effects of light and atmosphere, 2) Use of visible brushstrokes and broken color techniques, 3) Focus on everyday scenes and modern life rather than historical or mythological subjects."
  - Item:
    - type: document
    - source: art_history_lecture_5.pdf
    - content: parsed document content (with vector index for retrieval)
    - metadata: { "course": "Art History 201", "topic": "Impressionism" }
    - intent: null (used for retrieval matching, not direct fill)

## Supoort Platform
- Customed Fill-in Page
- Google Forms
- https://jobs.ashbyhq.com/baseten/fc6e5f2e-eb2d-4a6c-8a51-8422e8662bde/application

## Next Steps
- What's your nearest availabity for interview? / Why do you want to work here in Notion?
  - Item:
    - Prompt, but to call External MCP for info (Google Calendar etc.)
    - Search for Notion's core responsibility.


**Support Platform**
- Google Forms
- Job application (greenhouse)
- Canvas


**Support Page Level Fill**
