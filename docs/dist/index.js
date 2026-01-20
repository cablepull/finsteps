import { createBasicCameraHandle } from "./adapters/basicCamera.js";
import { createBasicOverlayHandle } from "./adapters/basicOverlay.js";
import { createMermaidDiagramAdapter } from "./adapters/mermaidDiagram.js";
import { MermaidController } from "./controller/controller.js";
import { MPFError } from "./errors.js";
const resolveAst = (options) => {
    if (options.ast) {
        return options.ast;
    }
    if (options.mpdText && options.options?.parseMpd) {
        return options.options.parseMpd(options.mpdText);
    }
    throw new MPFError("presentMermaid requires ast or mpdText with parseMpd", "MPF_INVALID_PRESENT_OPTIONS");
};
export const presentMermaid = async (options) => {
    const ast = resolveAst(options);
    const diagramAdapter = options.options?.diagram ?? createMermaidDiagramAdapter();
    const diagram = await diagramAdapter.render({
        mountEl: options.mountEl,
        mermaidText: options.mermaidText
    });
    const camera = options.options?.camera ?? createBasicCameraHandle(diagram);
    const overlay = options.options?.overlay ?? createBasicOverlayHandle();
    const controller = new MermaidController({
        diagram,
        camera,
        overlay,
        ast,
        actionHandlers: options.options?.actionHandlers,
        errorPolicy: options.options?.errorPolicy ?? "haltOnError",
        hooks: options.options?.hooks
    });
    await controller.init({ diagram });
    return controller;
};
export * from "./types.js";
export * from "./adapters/basicCamera.js";
export * from "./adapters/basicOverlay.js";
export * from "./adapters/mermaidDiagram.js";
export * from "./mocks/mockHandles.js";
export { parseMPD } from "./parser.js";
export { formatDiagnostics } from "./diagnostics.js";
export { ActionError, MPFError, ParseError } from "./errors.js";
//# sourceMappingURL=index.js.map