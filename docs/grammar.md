# MPD Grammar Documentation

This document provides a comprehensive guide to the MPD (Mermaid Presentation DSL) grammar, including the formal EBNF specification, quick reference, and examples.

## Quick Links

- **[Formal EBNF Grammar](ebnf/mpd.ebnf)** - Complete EBNF grammar specification
- **[JSON Schema](schema/mpd.json)** - Machine-readable schema for ParseResult
- **[Parser Compatibility Contract](mpd-parser/compatibility-contract.md)** - AST structure documentation
- **[Grammar Summary](mpd-parser/grammar.md)** - Parser implementation details

## Overview

MPD (Mermaid Presentation DSL) is a declarative language for defining interactive presentations over Mermaid diagrams. The grammar is formally specified in [EBNF notation](ebnf/mpd.ebnf).

### Program Structure

Every MPD program starts with a version header:

```mpd
mpd 1.0

deck {
  // Presentation content
}
```

## Top-Level Constructs

### Deck

A `deck` is the root container for presentation content:

```mpd
mpd 1.0

deck {
  scene default {
    step overview {
      camera reset();
      overlay bubble(target: dataId("A"), text: "Welcome!");
    }
  }
}
```

### Scene

A `scene` groups related steps and can optionally reference a specific diagram:

```mpd
scene intro {
  step overview {
    camera reset();
  }
  
  step detail {
    camera fit(target: dataId("B"));
  }
}

scene outro diagram "main-diagram" {
  step summary {
    camera fitAll();
  }
}
```

### Step

A `step` defines a presentation state with actions:

```mpd
step overview {
  camera reset();
  style highlight(target: dataId("A"));
  overlay bubble(target: dataId("A"), text: "Start here");
}
```

### Binding

A `binding` defines event-to-action mappings:

```mpd
binding {
  on click target node("A") {
    do nav.goto(id: "detail");
  }
  
  on key "ArrowRight" {
    do nav.next();
  }
}
```

## Expressions

### Literals

```mpd
let count = 42;              // Integer
let rate = 0.95;             // Number
let message = "Hello";       // String
let enabled = true;          // Boolean
let empty = null;            // Null
let duration = 500ms;        // Duration
let percent = 50%;           // Percent
let color = #3b82f6;        // Color hex
```

### Objects and Arrays

```mpd
let config = {
  theme: "dark",
  fontSize: 14,
  enabled: true
};

let items = [1, 2, 3, "four"];
```

### Target Expressions

Target expressions select diagram elements:

```mpd
node("A")                    // Node by ID
edge("A", "B")               // Edge between nodes
subgraph("cluster1")         // Subgraph by ID
css(".highlight")            // CSS selector
id("element-id")             // Element by ID
text("Label")                // Element by text content
dataId("nodeA")              // Element by data-id attribute

// Target combinations
union(node("A"), node("B"))  // Union of targets
intersect(target1, target2)  // Intersection
except(all, node("A"))       // All except A
group(node("A"), node("B"))  // Grouped selection
```

## Actions

### Camera Actions

```mpd
camera fit(target: dataId("A"), padding: 60, duration: 500, easing: "cubicOut");
camera reset();
camera zoom(factor: 1.2, center: { x: 100, y: 100 });
camera pan(deltaX: 50, deltaY: 0);
camera fitAll(padding: 40);
```

### Style Actions

```mpd
style highlight(target: dataId("A"));
style clear();
style classAdd(target: node("B"), className: "active");
style classRemove(target: node("B"), className: "inactive");
```

### Overlay Actions

```mpd
overlay bubble(target: dataId("A"), text: "Important note!");
overlay hide(id: "bubble-1");
```

### Navigation Actions

```mpd
nav.next();
nav.prev();
nav.goto(id: "overview");
nav.goto(index: 2);
nav.reset();
```

## Focus Statements

Focus statements combine camera positioning with optional styling:

```mpd
focus node("A") pad 60 align center lock xy id "main-focus";
```

Focus options:
- `pad <number>` - Padding around target
- `align <direction>` - Alignment (center, start, end, top, bottom, left, right)
- `lock <mode>` - Lock camera movement (none, x, y, xy)
- `id <identifier>` - Store focus bbox in `$focus.<id>`

## Runtime Configuration

### Camera Configuration

```mpd
runtime {
  camera {
    engine: "basic";
    options: {
      minZoom: 0.5,
      maxZoom: 3.0
    };
    bounds: viewport;
  }
}
```

### Overlay Configuration

```mpd
runtime {
  overlay {
    engine: "basic";
    options: {
      placement: "top",
      offset: 10
    };
  }
}
```

### Navigation Configuration

```mpd
runtime {
  navigation {
    wheelZoom: true;
    dragPan: true;
    tapToAdvance: true;
    progressUI: true;
    startAt: "overview";
    keys: {
      next: "ArrowRight",
      prev: "ArrowLeft"
    };
  }
}
```

## Diagram Declaration

Diagrams can be declared inline or referenced by ID:

```mpd
diagram "main" {
  mermaid <<<MERMAID
    flowchart LR
      A[Start] --> B[End]
  MERMAID;
  
  config {
    theme: "dark",
    flowchart: {
      curve: "basis"
    }
  };
}
```

## Selectors

Configure how targets resolve to diagram elements:

```mpd
selectors {
  strategy: mermaid-node-id;
  fallback: [css, text];
  node: {
    prefix: "node-",
    dataId: true
  };
  edge: {
    prefix: "edge-",
    byLabel: true
  };
}
```

## Styles

Define custom CSS classes and spotlight effects:

```mpd
styles {
  classes: {
    highlight: "finsteps-highlight",
    dim: "finsteps-dim"
  };
  spotlight: {
    activeClass: "finsteps-active",
    inactiveClass: "finsteps-inactive"
  };
  theme: dark;
}
```

## Complete Example

```mpd
mpd 1.0

deck {
  runtime {
    camera {
      engine: "basic";
      bounds: viewport;
    }
    navigation {
      wheelZoom: true;
      dragPan: true;
      startAt: "overview";
    }
  }
  
  scene default {
    step overview {
      camera reset();
      overlay bubble(target: dataId("A"), text: "Full diagram view");
    }
    
    step detail {
      camera fit(target: dataId("B"), padding: 60, duration: 500);
      style highlight(target: dataId("B"));
      overlay bubble(target: dataId("B"), text: "Detailed view");
    }
  }
  
  binding {
    on key "ArrowRight" {
      do nav.next();
    }
    on key "ArrowLeft" {
      do nav.prev();
    }
    on click target node("B") {
      do nav.goto(id: "detail");
    }
  }
}
```

## Formal Grammar

The complete EBNF grammar is available in [ebnf/mpd.ebnf](ebnf/mpd.ebnf). This formal specification defines:

- Lexical conventions (identifiers, literals, strings, comments)
- Program structure (program header, top-level items)
- Declaration syntax (diagrams, runtime, scenes, steps, bindings)
- Expression syntax (literals, operators, function calls, target expressions)
- Statement syntax (focus, do, let, assert)
- Action vocabulary (camera, style, overlay, navigation)

## Validation

MPD can be validated using:

- **Parser**: Use `parseMPD()` function to parse and get diagnostics
- **JSON Schema**: Validate ParseResult structure with [schema/mpd.json](schema/mpd.json)
- **TypeScript Types**: Use exported types for compile-time validation

## Related Documentation

- [EBNF Grammar](ebnf/mpd.ebnf) - Formal grammar specification
- [JSON Schema](schema/mpd.json) - Machine-readable schema
- [Parser Compatibility Contract](mpd-parser/compatibility-contract.md) - AST structure
- [Grammar Summary](mpd-parser/grammar.md) - Implementation details
- [Public API](api/public-api.md) - Runtime API documentation
