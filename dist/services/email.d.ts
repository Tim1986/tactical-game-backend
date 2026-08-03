export interface SendEmailInput {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
}
export interface SendEmailResult {
    ok: boolean;
    disabled?: boolean;
    id?: string;
    error?: string;
}
export declare function isEmailEnabled(): boolean;
export declare function sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
export interface SupportMessage {
    name: string;
    email: string;
    topic: string;
    message: string;
}
/** Deliver a support-form submission to the support inbox. */
export declare function sendSupportMessage(msg: SupportMessage): Promise<SendEmailResult>;
//# sourceMappingURL=email.d.ts.map