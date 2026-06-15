/**
 * EmailSender — the port for dispatching transactional emails.
 *
 * Architecture:
 *   Route  ── writes to emailQueue  (queueing — durable, retried by the worker)
 *   Worker ── dequeues + calls EmailSender.send()  (this port — the actual network call)
 *
 * The route layer is responsible for queueing; the worker is responsible for
 * dispatching. This interface is the seam between the worker and the email
 * provider. Production binds it to Brevo; development binds it to the console
 * so emails are never accidentally sent to real recipients in `next dev`.
 */
export interface EmailSender {
  send(params: { to: string; subject: string; htmlBody: string }): Promise<void>;
}
