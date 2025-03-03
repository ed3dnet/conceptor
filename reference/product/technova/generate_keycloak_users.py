#!/usr/bin/env python3.11

import os
import yaml
import json
import hashlib
import glob
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

# Find the script's directory (where llmgen-employee.schema.json is located)
SCRIPT_DIR = Path(__file__).parent

def log(message: str) -> None:
    """Print log messages to stderr."""
    print(message, file=sys.stderr)

def load_employees_from_yaml_files() -> List[Dict[str, Any]]:
    """Load all employees from YAML files in the employees directory."""
    employees = []
    # Look in the "employees" subdirectory
    yaml_files = glob.glob(str(SCRIPT_DIR / "employees" / "*.yaml"))
    
    log(f"Looking for YAML files in: {SCRIPT_DIR / 'employees'}")
    log(f"Found {len(yaml_files)} YAML files")
    
    for yaml_file in yaml_files:
        log(f"Processing file: {yaml_file}")
        with open(yaml_file, 'r', encoding='utf-8') as f:
            # YAML files contain multiple documents separated by "---"
            docs = yaml.safe_load_all(f)
            doc_count = 0
            for employee in docs:
                if employee:  # Skip empty documents
                    employees.append(employee)
                    doc_count += 1
            log(f"  Found {doc_count} employees in file")
    
    return employees

def generate_stable_hash(employee_id: str, length: int = 4) -> str:
    """Generate a stable numeric hash based on employee ID."""
    hash_obj = hashlib.md5(employee_id.encode())
    # Take first 8 hex characters and convert to integer
    hex_hash = hash_obj.hexdigest()[:8]
    numeric_hash = str(int(hex_hash, 16))
    # Return fixed length hash
    return numeric_hash[:length].zfill(length)

def create_keycloak_user(employee: Dict[str, Any]) -> Dict[str, Any]:
    """Convert employee data to Keycloak user format."""
    employee_id = employee["id"]
    first_name = employee["name"]["first"]
    last_name = employee["name"]["last"]
    preferred_name = employee["name"].get("preferred", first_name)
    
    # Create username: lowercase employee_id without punctuation
    username = "".join(c for c in employee_id.lower() if c.isalnum())
    
    # Create email: firstname/preferred.lastname.hash@example.net
    email_name = preferred_name.lower().replace(" ", "")
    email_last = last_name.lower().replace(" ", "")
    email_hash = generate_stable_hash(employee_id)
    email = f"{email_name}.{email_last}.{email_hash}@example.net"
    
    # Build attributes
    attributes = {
        "employeeId": [employee_id],
        "department": [employee["department"]],
        "title": [employee["title"]],
        "level": [employee.get("level", "")],
    }
    
    if "sub_department" in employee:
        attributes["subDepartment"] = [employee["sub_department"]]
    
    if "location" in employee:
        location = employee["location"]
        location_str = []
        if "city" in location:
            location_str.append(location["city"])
        if "country" in location:
            location_str.append(location["country"])
        if location_str:
            attributes["location"] = [", ".join(location_str)]
        if "remote" in location:
            attributes["remote"] = [str(location["remote"]).lower()]
    
    if "tenure" in employee and "hire_date" in employee["tenure"]:
        attributes["hireDate"] = [employee["tenure"]["hire_date"]]
    
    if "key_skills" in employee and employee["key_skills"]:
        attributes["keySkills"] = employee["key_skills"]
    
    if "product_association" in employee and employee["product_association"]:
        attributes["products"] = employee["product_association"]
    
    if "reporting" in employee:
        if "manager_id" in employee["reporting"]:
            attributes["managerId"] = [employee["reporting"]["manager_id"]]
        if "dotted_line_ids" in employee["reporting"]:
            attributes["dottedLineManagers"] = employee["reporting"]["dotted_line_ids"]
    
    # Create Keycloak user object
    keycloak_user = {
        "username": username,
        "enabled": True,
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "emailVerified": True,
        "attributes": attributes,
        "credentials": [
            {
                "type": "password",
                "value": "password",
                "temporary": False
            }
        ]
    }
    
    # Add preferred name if different from first name
    if preferred_name != first_name:
        keycloak_user["attributes"]["preferredName"] = [preferred_name]
    
    return keycloak_user

def create_keycloak_realm(employees: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Create Keycloak realm configuration with users."""
    keycloak_users = [create_keycloak_user(employee) for employee in employees]
    
    realm = {
        "realm": "technova",
        "enabled": True,
        "displayName": "TechNova Global",
        "users": keycloak_users,
        "clients": [
            {
                "clientId": "conceptor-oidc",
                "enabled": True,
                "protocol": "openid-connect",
                "publicClient": False,
                "redirectUris": ["*"],
                "secret": "oidc-client-secret",
                "standardFlowEnabled": True
            }
        ]
    }
    
    return realm

def main():
    """Main function to generate Keycloak realm file."""
    employees = load_employees_from_yaml_files()
    log(f"Found {len(employees)} employees in YAML files")
    
    realm_config = create_keycloak_realm(employees)
    log(f"Generated Keycloak realm with {len(realm_config['users'])} users")
    
    # Output the JSON to stdout
    print(json.dumps(realm_config, indent=2))

if __name__ == "__main__":
    main()
