# TechNova Team Generation Prompt

You are assisting with creating realistic organizational data for TechNova Global, a hypothetical Fortune 500 technology company used for demonstration purposes in the Conceptor project. The project already has C-Suite executives, EVPs/SVPs, and Directors defined. Now we need to build out teams under specific directors.

## Context

TechNova Global is a diversified technology corporation founded in 1982, headquartered in Seattle. The company has approximately 72,000 employees globally with $47 billion in annual revenue. TechNova's business lines include:

1. Enterprise Software Solutions (NovaSuite products)
2. Cloud Infrastructure Services (NovaCloud Platform)
3. Cybersecurity Services (NovaShield products)
4. Business Process Automation (NovaAutomate)
5. Data Analytics Platforms (NovaAnalytics)
6. Emerging technologies in AI, IoT, and Quantum Computing

The company has made numerous acquisitions, including CloudMatrix (2013), Processive Systems (2015), ConnectSystems (2018), MedTech Analytics (2021), QuantumWave Technologies (2022), DataSphere Systems (2023), SecureLogic (2023), IndustrialAI (2024), and CogniSoft (2024).

## Task

I need you to generate the team hierarchy under a specific director that I'll identify. **IMPORTANT**: Use namespaced employee IDs where each employee ID starts with their director's ID followed by a period and sequential numbering.

Example: For employees under Director EMP060, use IDs like:
- EMP060.001 (manager)
- EMP060.002 (manager)
- EMP060.001.001 (team member under the first manager)
- EMP060.001.002 (another team member under the first manager)

## Requirements for Team Structure

Create a realistic organizational structure with:

1. **Managers (first level under director)**:
   - 3-5 managers reporting directly to the director
   - Varied focus areas appropriate to the department
   - Give each a distinct sub-functional focus

2. **Team Leads/Supervisors (under selected managers)**:
   - Only create team leads for 2-3 of the managers (not all)
   - 2-3 team leads per selected manager
   - Specialty focus aligned with their manager's function

3. **Individual Contributors**:
   - Only create team members for 2-3 team leads (not all)
   - 3-5 individual contributors under each selected team lead
   - Some teams should be larger than others based on function
   - Create a realistic mix of senior and junior employees

## Employee Data Schema

Use our JSON Schema, stored in our project knowledge base, to generate employee data. It should look generally like this:

```yaml
id: "EMPxxx.yyy[.zzz]"  # Namespaced ID (director.manager[.employee])
name:
  first: "FirstName"
  last: "LastName"
  preferred: "Nickname"  # Optional (include for ~30% of employees)
title: "Job Title"
level: "Manager/Senior/Associate/Junior"  # Appropriate to position
department: "Department Name"  # Same as director's department
sub_department: "Team Name"  # More specific than director's
location:
  city: "City"
  country: "Country"
  remote: true/false  # ~25% should be remote
reporting:
  manager_id: "EMPxxx.yyy"  # Direct manager ID
  dotted_line_ids: ["EMPaaa.bbb"]  # Optional (~15% should have this)
tenure:
  hire_date: "YYYY-MM-DD"  # Realistic distribution (2010-2025)
  acquired_from: "Company Name"  # Optional (for ~20% of employees)
  acquisition_date: "YYYY-MM-DD"  # Required if acquired_from is present
key_skills: ["Skill 1", "Skill 2", "Skill 3", "Skill 4"]  # 3-5 relevant skills
product_association: ["Product 1", "Product 2"]  # Optional, relevant products
```

## Diversity Considerations

Ensure the generated data includes:
- Geographic diversity appropriate to the function
- Mix of tenure lengths (veterans and recent hires)
- Some employees who joined through acquisitions
- Balance of specialists and generalists
- Skills relevant to the specific department and products
- The occasional gap in the hierarchy; for example, a team lead without a manager, reporting directly to the director, or two team leads with VERY different responsibilities reporting to the same manager. Later phases will use this to create an "empty" lead role for an organizational unit, or the same manager leading two organizational units.

I'll provide you with a specific director ID (e.g., "Generate team hierarchy for EMP060"). Please create an organizational structure under that director following these guidelines.

When asked to generate a tree under a director, it should be an artifact in YAML format using the JSON Schema provided in our project knowledge base.

DO NOT include the director themselves in the data you emit.