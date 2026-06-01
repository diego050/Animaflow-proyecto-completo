"""
Sync component props from TypeScript files to the database.

Reads TSX files from frontend/src/remotion/components/ and primitives/,
extracts props interfaces and default values, and syncs to the components table.

Usage:
    cd backend
    python scripts/sync_component_props.py

    # Or with custom paths:
    python scripts/sync_component_props.py --frontend ../frontend --dry-run
"""
import re
import os
import sys
import json
import argparse
from typing import Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import ComponentModel
from app.core.logging import get_logger

logger = get_logger("sync_props")

# UniversalProps base (from frontend/src/remotion/components/types.ts)
UNIVERSAL_PROPS = {
    "x": {"type": "number", "default": 540, "description": "Posicion horizontal (px)"},
    "y": {"type": "number", "default": 960, "description": "Posicion vertical (px)"},
    "color": {"type": "string", "description": "Color principal / acento (hex)"},
    "bgColor": {"type": "string", "description": "Color de fondo (hex)"},
    "textColor": {"type": "string", "description": "Color del texto (hex)"},
    "fontSize": {"type": "number", "description": "Tamano de fuente (px)"},
    "width": {"type": "number", "description": "Ancho del componente (px)"},
    "height": {"type": "number", "description": "Alto del componente (px)"},
    "delay": {"type": "number", "default": 0, "description": "Frames de retraso"},
}

# Components that are primitives (don't extend UniversalProps)
PRIMITIVES = {
    "AnimaRect", "AnimaCircle", "AnimaPath", "AnimaText",
    "AnimaImage", "AnimaGroup", "AnimaParticles", "AnimaGradient",
}


def parse_tsx_file(filepath: str) -> Optional[dict]:
    """Parse a TSX file and extract component name, props, and defaults."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract component name from filename
    filename = os.path.basename(filepath)
    component_name = filename.replace('.tsx', '')

    # Skip non-component files
    if component_name in ('types', 'Root', 'index'):
        return None

    props = {}
    defaults = {}
    extends_universal = component_name not in PRIMITIVES

    # Pattern 1: Named interface (export interface XProps extends UniversalProps { ... })
    interface_match = re.search(
        r'(?:export\s+)?interface\s+\w*Props\s*(?:extends\s+UniversalProps)?\s*\{([^}]+)\}',
        content, re.DOTALL
    )

    if interface_match:
        props_block = interface_match.group(1)
        props = parse_props_block(props_block)

    # Pattern 2: Inline intersection (React.FC<{ ... } & UniversalProps>)
    if not props:
        inline_match = re.search(
            r'React\.FC<\{([^}]+)\}\s*&\s*UniversalProps>',
            content, re.DOTALL
        )
        if inline_match:
            props_block = inline_match.group(1)
            props = parse_props_block(props_block)

    # Pattern 3: Inline without UniversalProps (React.FC<{ ... }>)
    if not props:
        inline_match = re.search(
            r'React\.FC<\{([^}]+)\}>',
            content, re.DOTALL
        )
        if inline_match:
            props_block = inline_match.group(1)
            props = parse_props_block(props_block)

    # Extract defaults from destructuring: ({ color = '#fff', x = 540 })
    destruct_match = re.search(
        r'\(\s*\{([^}]+)\}\s*(?::\s*\w+)?\s*\)',
        content, re.DOTALL
    )
    if destruct_match:
        defaults = parse_defaults(destruct_match.group(1))

    # Merge UniversalProps if applicable
    if extends_universal:
        merged = {**UNIVERSAL_PROPS, **props}
        # Override UniversalProps defaults with component-specific defaults
        for key, value in defaults.items():
            if key in merged:
                merged[key]["default"] = value
            else:
                merged[key] = {"type": infer_type(value), "default": value}
        props = merged
    else:
        # For primitives, just apply defaults
        for key, value in defaults.items():
            if key in props:
                props[key]["default"] = value
            else:
                props[key] = {"type": infer_type(value), "default": value}

    return {
        "name": component_name,
        "props_schema": props,
    }


def parse_props_block(block: str) -> dict:
    """Parse a TypeScript props block into a dict."""
    props = {}
    lines = block.strip().split('\n')

    for line in lines:
        line = line.strip().rstrip(',').rstrip(';')
        if not line or line.startswith('//') or line.startswith('*'):
            continue

        # Match: propName?: type | type2;  or  propName: type;
        match = re.match(r'(\w+)(\?)?:\s*(.+?)(?:;)?$', line)
        if not match:
            continue

        name = match.group(1)
        optional = match.group(2) == '?'
        type_str = match.group(3).strip()

        prop_def = {"type": map_ts_type(type_str)}

        # Handle union types as enums
        if '|' in type_str:
            values = [v.strip().strip("'").strip('"') for v in type_str.split('|')]
            prop_def["enum"] = values

        if not optional:
            prop_def["required"] = True

        props[name] = prop_def

    return props


def parse_defaults(destruct_str: str) -> dict:
    """Parse destructuring defaults: color = '#fff', x = 540"""
    defaults = {}
    # Match: key = value (handle strings, numbers, booleans, arrays)
    for match in re.finditer(r'(\w+)\s*=\s*([^,}\n]+)', destruct_str):
        key = match.group(1).strip()
        value_str = match.group(2).strip()
        defaults[key] = parse_value(value_str)
    return defaults


def parse_value(value_str: str):
    """Parse a TypeScript default value string into a Python value."""
    value_str = value_str.strip()

    # String
    if value_str.startswith("'") or value_str.startswith('"'):
        return value_str.strip("'\"")

    # Boolean
    if value_str == 'true':
        return True
    if value_str == 'false':
        return False

    # Number
    try:
        if '.' in value_str:
            return float(value_str)
        return int(value_str)
    except ValueError:
        pass

    # Array
    if value_str.startswith('['):
        try:
            return json.loads(value_str.replace("'", '"'))
        except json.JSONDecodeError:
            return value_str

    return value_str


def map_ts_type(ts_type: str) -> str:
    """Map TypeScript types to JSON schema types."""
    ts_type = ts_type.strip()

    if ts_type == 'string':
        return 'string'
    if ts_type in ('number', 'integer'):
        return 'number'
    if ts_type == 'boolean':
        return 'boolean'
    if ts_type.startswith('number[]') or ts_type.startswith('Array<number>'):
        return 'array'
    if ts_type.startswith('string[]'):
        return 'array'
    if '|' in ts_type:
        return 'string'  # Union types are strings with enum
    if ts_type.startswith("'") or ts_type.startswith('"'):
        return 'string'

    return 'string'  # Default


def infer_type(value) -> str:
    """Infer JSON type from a Python value."""
    if isinstance(value, bool):
        return 'boolean'
    if isinstance(value, int):
        return 'number'
    if isinstance(value, float):
        return 'number'
    if isinstance(value, str):
        return 'string'
    if isinstance(value, list):
        return 'array'
    return 'string'


def sync_to_db(components: list[dict], dry_run: bool = False):
    """Sync extracted components to the database."""
    db = SessionLocal()
    created = 0
    updated = 0
    skipped = 0
    deactivated = 0

    try:
        # Get all existing components
        existing = {c.name: c for c in db.query(ComponentModel).all()}
        incoming_names = {c["name"] for c in components}

        for comp in components:
            name = comp["name"]
            props_schema = comp["props_schema"]

            if name in existing:
                existing_comp = existing[name]
                existing_props = existing_comp.props_schema or {}

                # Compare props (normalize for comparison)
                if json.dumps(existing_props, sort_keys=True) == json.dumps(props_schema, sort_keys=True):
                    logger.info(f"  SKIP  {name}: props unchanged")
                    skipped += 1
                else:
                    if dry_run:
                        logger.info(f"  UPDATE  {name}: would update props")
                        logger.info(f"     Old: {json.dumps(existing_props, indent=2)[:200]}...")
                        logger.info(f"     New: {json.dumps(props_schema, indent=2)[:200]}...")
                    else:
                        existing_comp.props_schema = props_schema
                        db.commit()
                        logger.info(f"  OK  {name}: props updated")
                    updated += 1
            else:
                if dry_run:
                    logger.info(f"  CREATE  {name}: would create")
                else:
                    new_comp = ComponentModel(
                        name=name,
                        slug=name.lower(),
                        role=infer_role(name),
                        category=infer_category(name),
                        description=f"Remotion component: {name}",
                        tags=[name.lower()],
                        tsx_path=f"components/{name}.tsx",
                        props_schema=props_schema,
                        is_active=True,
                    )
                    db.add(new_comp)
                    db.commit()
                    logger.info(f"  OK  {name}: created with props")
                created += 1

        # Deactivate components that no longer exist in filesystem
        for name, comp in existing.items():
            if name not in incoming_names and comp.is_active:
                if dry_run:
                    logger.info(f"  DEACTIVATE  {name}: would deactivate (not in filesystem)")
                else:
                    comp.is_active = False
                    db.commit()
                    logger.info(f"  DEACTIVATE  {name}: deactivated")
                deactivated += 1

        logger.info(f"\nSummary: {created} created, {updated} updated, {skipped} skipped, {deactivated} deactivated")

    except Exception as e:
        db.rollback()
        logger.error(f"Sync failed: {e}")
        raise
    finally:
        db.close()


def infer_role(name: str) -> str:
    """Infer role from component name (same logic as seed_components.py)."""
    name_lower = name.lower()
    if any(kw in name_lower for kw in ["transition", "wipe"]):
        return "transition"
    if any(kw in name_lower for kw in ["text", "typewriter", "title", "quote", "split", "glitch", "underline", "highlight", "strike", "swap", "reveal"]):
        return "text"
    if any(kw in name_lower for kw in ["background", "wave", "kinetic", "gradient", "particle", "blob", "grid", "rays", "abstract", "vfx", "overlay"]):
        return "background"
    if any(kw in name_lower for kw in ["chart", "graph", "bar", "pie", "funnel", "radar", "trend", "counter", "scoreboard", "percentage", "progress"]):
        return "dataviz"
    if any(kw in name_lower for kw in ["tiktok", "tweet", "instagram", "youtube", "social", "follower", "subscribe"]):
        return "social"
    if any(kw in name_lower for kw in ["notification", "toast", "loading", "spinner", "timer", "countdown", "badge", "pill", "button", "selector", "browser", "phone", "terminal", "code", "calendar", "search", "message", "bubble", "lower", "third", "promo", "banner", "flash", "sale", "pricing", "table", "feature", "unlock", "checklist", "size", "app", "store", "music", "player", "podcast", "guest", "card", "testimonial", "review", "breaking", "news", "ticker", "alert", "cursor", "click", "emoji", "float", "floating", "tinder", "swipe", "product", "shopping", "cart", "git", "commit", "frame", "media", "api", "request", "flow"]):
        return "ui"
    return "decorative"


def infer_category(name: str) -> str:
    """Infer category from component name."""
    return "general"


def main():
    parser = argparse.ArgumentParser(description="Sync component props from TSX files to DB")
    parser.add_argument("--frontend", default="../frontend", help="Path to frontend directory")
    parser.add_argument("--dry-run", action="store_true", help="Show changes without applying")
    args = parser.parse_args()

    components_dir = os.path.join(args.frontend, "src", "remotion", "components")
    primitives_dir = os.path.join(args.frontend, "src", "remotion", "primitives")

    components = []

    # Scan components directory
    if os.path.exists(components_dir):
        for filename in sorted(os.listdir(components_dir)):
            if filename.endswith('.tsx') and not filename.startswith('index'):
                filepath = os.path.join(components_dir, filename)
                result = parse_tsx_file(filepath)
                if result:
                    components.append(result)
                    logger.info(f"Parsed {filename}: {len(result['props_schema'])} props")

    # Scan primitives directory
    if os.path.exists(primitives_dir):
        for filename in sorted(os.listdir(primitives_dir)):
            if filename.endswith('.tsx') and filename.startswith('Anima') and not filename.startswith('index'):
                filepath = os.path.join(primitives_dir, filename)
                result = parse_tsx_file(filepath)
                if result:
                    components.append(result)
                    logger.info(f"Parsed {filename}: {len(result['props_schema'])} props")

    logger.info(f"\nFound {len(components)} components")

    if args.dry_run:
        logger.info("DRY RUN - no changes will be applied\n")

    sync_to_db(components, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
