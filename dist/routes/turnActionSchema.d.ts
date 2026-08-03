import { z } from 'zod';
export declare const TurnActionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"MOVE">;
    unitInstanceId: z.ZodString;
    destination: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        y: number;
        x: number;
    }, {
        y: number;
        x: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "MOVE";
    unitInstanceId: string;
    destination: {
        y: number;
        x: number;
    };
}, {
    type: "MOVE";
    unitInstanceId: string;
    destination: {
        y: number;
        x: number;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"CHARGE">;
    unitInstanceId: z.ZodString;
    destination: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        y: number;
        x: number;
    }, {
        y: number;
        x: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "CHARGE";
    unitInstanceId: string;
    destination: {
        y: number;
        x: number;
    };
}, {
    type: "CHARGE";
    unitInstanceId: string;
    destination: {
        y: number;
        x: number;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"USE_ABILITY">;
    unitInstanceId: z.ZodString;
    abilitySlug: z.ZodString;
    target: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        y: number;
        x: number;
    }, {
        y: number;
        x: number;
    }>;
    pushDestination: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        y: number;
        x: number;
    }, {
        y: number;
        x: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    target: {
        y: number;
        x: number;
    };
    type: "USE_ABILITY";
    unitInstanceId: string;
    abilitySlug: string;
    pushDestination?: {
        y: number;
        x: number;
    } | undefined;
}, {
    target: {
        y: number;
        x: number;
    };
    type: "USE_ABILITY";
    unitInstanceId: string;
    abilitySlug: string;
    pushDestination?: {
        y: number;
        x: number;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"END_TURN">;
}, "strip", z.ZodTypeAny, {
    type: "END_TURN";
}, {
    type: "END_TURN";
}>]>;
export declare const SubmitTurnSchema: z.ZodObject<{
    actions: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"MOVE">;
        unitInstanceId: z.ZodString;
        destination: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            y: number;
            x: number;
        }, {
            y: number;
            x: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "MOVE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    }, {
        type: "MOVE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"CHARGE">;
        unitInstanceId: z.ZodString;
        destination: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            y: number;
            x: number;
        }, {
            y: number;
            x: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "CHARGE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    }, {
        type: "CHARGE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"USE_ABILITY">;
        unitInstanceId: z.ZodString;
        abilitySlug: z.ZodString;
        target: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            y: number;
            x: number;
        }, {
            y: number;
            x: number;
        }>;
        pushDestination: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            y: number;
            x: number;
        }, {
            y: number;
            x: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        target: {
            y: number;
            x: number;
        };
        type: "USE_ABILITY";
        unitInstanceId: string;
        abilitySlug: string;
        pushDestination?: {
            y: number;
            x: number;
        } | undefined;
    }, {
        target: {
            y: number;
            x: number;
        };
        type: "USE_ABILITY";
        unitInstanceId: string;
        abilitySlug: string;
        pushDestination?: {
            y: number;
            x: number;
        } | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"END_TURN">;
    }, "strip", z.ZodTypeAny, {
        type: "END_TURN";
    }, {
        type: "END_TURN";
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    actions: ({
        type: "MOVE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    } | {
        target: {
            y: number;
            x: number;
        };
        type: "USE_ABILITY";
        unitInstanceId: string;
        abilitySlug: string;
        pushDestination?: {
            y: number;
            x: number;
        } | undefined;
    } | {
        type: "END_TURN";
    } | {
        type: "CHARGE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    })[];
}, {
    actions: ({
        type: "MOVE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    } | {
        target: {
            y: number;
            x: number;
        };
        type: "USE_ABILITY";
        unitInstanceId: string;
        abilitySlug: string;
        pushDestination?: {
            y: number;
            x: number;
        } | undefined;
    } | {
        type: "END_TURN";
    } | {
        type: "CHARGE";
        unitInstanceId: string;
        destination: {
            y: number;
            x: number;
        };
    })[];
}>;
//# sourceMappingURL=turnActionSchema.d.ts.map