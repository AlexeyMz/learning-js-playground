declare class RainyDay {
    /**
     * TRAIL function: no trail at all
     */
    TRAIL_NONE: (drop) => void;
    /**
     * TRAIL function: trail of small drops (default)
     * @param drop raindrop object
     */
    TRAIL_DROPS: (drop) => void;
    /**
     * GRAVITY function: no gravity at all
     */
    GRAVITY_NONE: (drop) => boolean;
    /**
     * GRAVITY function: linear gravity
     */
    GRAVITY_LINEAR: (drop) => boolean;
    /**
     * GRAVITY function: non-linear gravity (default)
     */
    GRAVITY_NON_LINEAR: (drop) => boolean;
    /**
     * REFLECTION function: no reflection at all
     */
    REFLECTION_NONE: (drop) => void;
    /**
     * REFLECTION function: miniature reflection (default)
     */
    REFLECTION_MINIATURE: (drop) => void;

    public gravity: (drop) => boolean;
    public trail: (drop) => void;
    public reflection: (drop) => void;

    /**
     * Defines a new instance of the rainyday.js.
     * @param canvasid DOM id of the canvas used for rendering
     * @param sourceid DOM id of the image element used as background image
     * @param width width of the rendering
     * @param height height of the rendering
     * @param opacity opacity attribute value of the glass canvas (default: 1)
     * @param blur blur radius (default: 20)
     */
    constructor(canvasid: string, sourceid: string, width: number, height: number, opacity: number, blur: number);
    /**
     * Creates a new preset object with given attributes.
     * @param min minimum size of a drop
     * @param base base value for randomizing drop size
     * @param quan probability of selecting this preset (must be between 0 and 1)
     * @returns present object with given attributes
     */
    public preset(min: number, base: number, quan: number): RainPreset;
    /**
     * Main function for starting rain rendering.
     * @param presets list of presets to be applied
     * @param speed speed of the animation (if not provided or 0 static image will be generated)
     */
    public rain(presets: RainPreset[], speed?: number): void;
}

declare class RainPreset {
}