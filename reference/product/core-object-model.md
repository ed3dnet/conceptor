# Core Entity Model

## Core Business Entities

### User

Users represent individuals who interact with the organization, including employees and contractors.

**Attributes:**

- `id`: Unique identifier  
- `name`: Full name  
- `title`: Job title  
- `level`: Organizational level/seniority  
- `type`: Employee or Contractor  
- `start_date`: When the user began their relationship with the organization  
- `email`: Contact information  
- `key_skills`: Array of skills and expertise areas  
- `location`: Physical or remote work location  
- `acquired_from`: If the user joined through acquisition, the source company

**Relationships:**

- Occupies one or more Units  
- Participates in Initiatives  
- Provides Answers to Questions  
- Has Relationships with other Users

### Unit

Units represent organizational positions or roles that can be filled by users.

**Attributes:**

- `id`: Unique identifier  
- `name`: Unit name  
- `type`: Individual position, team, management position, etc.  
- `description`: Purpose and function  
- `parent_unit_id`: The larger organizational unit this belongs to  
- `created_date`: When the unit was established  
- `status`: Active, planned, deprecated

**Relationships:**

- Contains child Units  
- Belongs to parent Unit  
- Occupied by one or more Users  
- Implements Capabilities  
- Participates in Initiatives  
- Subject of Questions and Insights

### Initiative

Initiatives represent activities, projects, or efforts that cut across the organization.

**Attributes:**

- `id`: Unique identifier  
- `name`: Initiative name  
- `description`: Purpose and goals  
- `start_date`: When the initiative began  
- `expected_end_date`: Projected completion (if applicable)  
- `actual_end_date`: Actual completion (if applicable)  
- `status`: Planning, active, completed, canceled  
- `priority`: Organizational priority level  
- `initiative_type`: Project, program, transformation, etc.

**Relationships:**

- Involves multiple Units  
- Assigned to Users  
- Requires Capabilities  
- Subject of Questions and Insights  
- Target of Potential Actions

### Capability

Capabilities represent what the organization can do, distinct from how it does it.

**Attributes:**

- `id`: Unique identifier  
- `name`: Capability name  
- `description`: What this capability enables  
- `category`: Business function area  
- `maturity`: Level of organizational proficiency  
- `formality`: Formal (explicitly defined) or informal (emerged through practice)  
- `criticality`: Importance to organizational operations

**Relationships:**

- Implemented by Units  
- Required by Initiatives  
- Dependent on other Capabilities  
- Subject of Questions and Insights  
- Target of Potential Actions

### Relationship

Relationships represent connections between entities in the organization.

**Attributes:**

- `id`: Unique identifier  
- `entity1_id`: First entity in the relationship  
- `entity1_type`: Type of the first entity (User, Unit, etc.)  
- `entity2_id`: Second entity in the relationship  
- `entity2_type`: Type of the second entity  
- `relationship_type`: Nature of the relationship (e.g., reports-to, collaborates-with)  
- `relationship_level`: Formal, informal  
- `relationship_strength`: Measure of connection strength  
- `discovery_method`: How this relationship was identified  
- `relationship_inference`: Whether directly observed or inferred

**Relationships:**

- Connects two entities (User-User, Unit-Unit, User-Unit, etc.)  
- Evidence for Insights  
- Subject of Questions

## Knowledge Acquisition Entities

### Ask

Asks represent specific queries presented to users to gather organizational knowledge.

**Attributes:**

- `id`: Unique identifier, uses rich ID prefix `ask` when publicly referenced
- `hardcode_kind`: "hard code" asks are, when answered, routed to specific code paths that may or may not involve LLMs. this allows us to differentiate on them when we need to.
- `source_agent_name`: Agent that generated this question (if any)
- `notify_source_agent`: Whether to notify the source agent when the question is answered (must be set if `source_agent_name` is set)
- `query`: a JSON object representing a set of questions. Think Google Forms.
   - each question in `query`:
      - Should support one of boolean, gradient, multiple choice, and text questions
      - For booleans, gradients, and multiple choice questions, each potential answer should include a text string that will be used by the response processor pair to provide context to the LLM that receives these.
      - for example, for gradient values 1-5, the text may be:
         1. "I strongly disagree that XYZ is an important priority for my team"
         2. "I disagree that XYZ is an important priority for my team"
         3. "I have no strong feeling on whether XYZ is an important priority for my team"
         4. "I agree that XYZ is an important priority for my team"
         5. "I strongly agree that XYZ is an important priority for my team"
      - For text questions, the user will be able to provide a free-form answer.
         - `question_text`: the question being asked
         - `description`: an optional, in-depth description (can use Markdown)
         - `minimum_words`: the minimum number of words the user must provide in their answer
         - `maximum_words`: the maximum number of words the user may provide in their answer
         - `cleanup`: controls whether the editing LLM should be invoked to clean up this answer without modifying the content
            - if `false`, don't do it
            - `true` is the default
            - can pass an object instead of `true`
               - `llm_context`: additional contextual text to pass to the editing LLM so it does a better job than the default prompt.
      - `llm_context`: this will be passed to the answer processor to provide additional context when creating the processed response.
- `visibility`: how visible this ask is to agents and other users within the system
   - `private`: this ask is available ONLY to the agent for the subject that created it--so if `user-ABC` answers a `private` ask for `unit-DEF`, only `unit-DEF`'s agent is able to see this.
      - the intent here is to allow the agent to develop additional context in which to place other questions, and to create new questions for the answerer.
      - other agents asking `unit-DEF`'s agent questions may NOT see this ask and any answers to this ask, or insights that point back to this ask, must be masked from the agent while answering them.
   - `derive-only`: like `private`, this ask is available only to the agent for the subject that created it, _but_ it may yield Insights that can be used in responses from other agents.
      - the intent here is to allow a user to speak reasonably frankly, but to allow the agent to use this information to inform other questions.
      - other agents asking `unit-DEF`'s agent questions may NOT see this ask. Any answers that point back to this ask must be masked from the agent while answering them, but insights that point to this ask may be used in responses from other agents.
   - `upward`: this ask and answers are available to agents for units higher in the tree than `unit-DEF`, as well as queries made by leaders for those units (e.g., `unit-DEF` is part of `unit-GHI`, so `unit-GHI` can ask, but manager `unit-JKL` can also ask because that unit is GHI's leader)
   - `downward`: this ask and answers are available to agents for units lower in the tree than `unit-DEF`, as well as queries made by subordinates for those units (e.g., `unit-XYZ` is `unit-GHI`'s VP-level unit, so `downward` answers from XYZ are available to GHI and to DEF)
      - TODO: do we actually proactively inform based on this?
   - `public`: this ask and answer is available to any agent in the system.
      - generally speaking, broadcasted asks like this are probably pretty rare.
   - in the UI, we do need to stress that agents are prompted to raise flags for answers that may indicate legal issues, even for private asks.
- `multiple_answer_strategy`
   - `disallow`
   - `remember-last`

### Ask Reference

An Ask Reference is populated by the system (either hard code or agent) to help the LLMs link together what other entities the answer is related to.

- `id`: Unique identifier, uses rich ID prefix `askref` when publicly referenced
- `ask_id`: ID of the ask being referenced
- `reference_direction`: either `subject` or `object`
   - is it asking OF the reference target (`subject`) or ABOUT the reference target (`object`)?
- `unit_id`: ID of the unit being referenced (can be nullable)
- `initiative_id`: ID of the initiative being referenced (can be nullable)
- `capability_id`: ID of the capability being referenced (can be nullable)
- `answer_id`: ID of the answer being referenced (can be nullable)
   - used for follow-up questions, must always be `object`

only one foreign key may be non-null at any given time in a given row.

### Ask Response

Ask Responses represent the raw responses to specific asks. They are not, by themselves, actionable to the system.

**Attributes:**

- `id`: Unique identifier, uses rich ID prefix `askresp` when publicly referenced
- `user_id`: User who provided the answer
- `ask_id`: The question being answered
- `created_at`
- `response`: the raw response, in a JSON format that echoes the format of `ask.query`.
   - if `cleanup` was on, the user should be provided the opportunity to accept or reject the cleanup before creating the `answer`; this will be implemented browser-side and the server API will assume these responses are canonical.

PLEASE NOTE: The same user can, if `ask.multiple_answer_strategy` allows, answer the same question multiple times. We will need to enact a data cleanup on existing data to ensure consistency.

## Analysis Entities

### Answer

An Answer is a processed response of a single question within an `ask.query`. We extract it from `askResponse.response` and, when appropriate, extract potentially interesting content from the answer.

- `id`: Unique identifier. Uses rich ID prefix `answer` when publicly referenced (but this is rare except during debugging).
- `ask_response_id`: The `askResponse` this answer is associated with.
- `question`: The question that was asked, as sourced from `ask.query`. Copy the entire question here.
- `response`: The extracted text from the answer.
   - for booleans, gradients, etc. this should be the text associated with the equivalent response from `ask.query`.
   - for text questions, this should be the full text of the answer.

### Insight
An Insight is a derived understanding or interpretation based on multiple answers. It is not a direct answer to a question but rather an analysis of the information gathered. Insights are generated by agents and can be used to inform potential actions.

The basic "look at an insight" will be for a unit's agent (with its history loaded into it; history generation from insights/information TBD but probably needs a vector database and embeddings) to look at all answers related to a specific `ask_response_id` in a single pass to derive zero or more insights.

**Attributes:**

- `id`: Unique identifier  
- `text`: The insight content  
- `timestamp`: When generated  
- `last_validated`: When last confirmed  
- `source_agent_id`: Agent that generated this insight  
- `subject_ids`: Primary entities the insight is about  
- `subject_types`: Types of subject entities  
- `object_ids`: Other relevant entities  
- `object_types`: Types of object entities  
- `supporting_answer_ids`: Links to specific answers  
- `org_level`: Individual, team, department, or enterprise  
- `confidence_factors`: Quantifiable support metrics (\# of sources, consistency)  
- `staleness`: Current freshness score  
- `insight_type`: Dependency, capability gap, information flow, volunteered information, sentiment, contradiction, etc.  
- `contradiction_status`: Whether this resolves or surfaces contradictions  
- `analysis_method`: Pattern recognition, sentiment analysis, volunteer information identification, etc.

**Relationships:**

- Generated by Agent  
- Concerns Subject entities  
- References Object entities  
- Supported by Answers  
- Related to other Insights  
- May lead to Potential Actions


#### Insight Types

The Insight entity supports various types of analytical results, including:

1. **Volunteered Information Insights**:  
     
   - Identify information users mention unprompted  
   - Reveal what users consider important enough to volunteer  
   - Help discover priorities and concerns not directly questioned

   

2. **Pattern Recognition Insights**:  
     
   - Identify common themes across multiple answers  
   - Discover organizational patterns mentioned by different users  
   - Highlight consistency or inconsistency in understanding

   

3. **Sentiment Analysis Insights**:  
     
   - Capture emotional context around topics and entities  
   - Identify areas of frustration, satisfaction, or concern  
   - Reveal how users feel about processes, initiatives, etc.

   

4. **Contradiction Insights**:  
     
   - Highlight conflicting answers about the same subject  
   - Identify areas requiring clarification or resolution  
   - Support reconciliation of different perspectives

   

5. **Capability Insights**:  
     
   - Discover formal and informal capabilities  
   - Identify capability gaps or redundancies  
   - Map capability implementations across units

   

6. **Relationship Insights**:  
     
   - Reveal informal relationships not in formal structures  
   - Identify key collaborations and dependencies  
   - Discover communication patterns and bottlenecks

## Key System Principles

1. **Epistemological Chain**:  
     
   - Questions are designed to elicit specific knowledge  
   - Answers represent subjective perspectives, not claimed as truth  
   - Insights derive patterns and interpretations from multiple answers  
   - Potential Actions suggest responses to insights

   

2. **Knowledge Freshness**:  
     
   - All entities have appropriate staleness factors  
   - System automatically identifies stale knowledge  
   - Questions can be re-asked to refresh important areas  
   - Insights are regenerated when supporting answers change

   

3. **Contradiction Management**:  
     
   - Contradictory answers can coexist in the system  
   - Insights can highlight contradictions for resolution  
   - Resolution can occur through additional questions or management input  
   - Answers can be superseded without deletion

   

4. **Organic Discovery**:  
     
   - System emphasizes discovering capabilities rather than imposing frameworks  
   - Both formal and informal structures are captured  
   - Actual work patterns may differ from documented processes  
   - Cross-validation occurs through multiple information sources

   

5. **Hard/Soft Data Separation**:  
     
   - Hard data (Questions, Answers) captures only factual exchanges  
   - Soft data (Insights, Potential Actions) contains interpretations and analyses  
   - LLM agents operate primarily at the soft data layer  
   - Clear lineage maintained between insights and supporting hard data

   

6. **Multi-Level Analysis**:  
     
   - Information is collected at individual level  
   - Insights can be generated at any organizational level  
   - Patterns can emerge bottom-up from individual responses  
   - Top-down hypotheses can be verified through targeted questions

   

7. **Multi-Insight Generation**:  
     
   - A single answer can spawn multiple insights of different types  
   - Different agents may analyze the same data for different patterns  
   - Insights can combine and synthesize information from multiple answers  
   - Each insight maintains clear provenance to its source data
