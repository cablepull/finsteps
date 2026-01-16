# React Hook Example

```tsx
import { useEffect, useRef, useState } from "react";
import { presentMermaid, type Controller } from "finsteps";

export const useMermaidPresentation = (mermaidText: string, ast: unknown) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [controller, setController] = useState<Controller | null>(null);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }
    let isMounted = true;
    presentMermaid({
      mountEl: mountRef.current,
      mermaidText,
      ast
    }).then((instance) => {
      if (isMounted) {
        setController(instance);
      } else {
        instance.destroy();
      }
    });
    return () => {
      isMounted = false;
      controller?.destroy();
    };
  }, [mermaidText, ast]);

  return { mountRef, controller };
};
```

```tsx
const Example = () => {
  const { mountRef, controller } = useMermaidPresentation(
    "graph TD\\n  A --> B",
    { steps: [{ id: "intro", actions: [] }] }
  );

  return (
    <div>
      <div ref={mountRef} style={{ height: 400 }} />
      <button onClick={() => controller?.prev()}>Prev</button>
      <button onClick={() => controller?.next()}>Next</button>
    </div>
  );
};
```
