// Producers stay so code that enqueues still works; the template's consumer does not start,
// because a job a test leaves on the queue is then delivered to the fixture Worker and can hang
// the run (gr-base-215). MANGO_TEST_QUEUE_CONSUMERS=1, or `queueConsumers: true` on a runtime
// whose worker handles queue batches, opts in to the real consumer.
export const queueConsumersOptedIn = () => process.env.MANGO_TEST_QUEUE_CONSUMERS === '1';
export const testTemplate = (template, keepConsumers = queueConsumersOptedIn()) =>
  keepConsumers ? template : template.replace(/\n?\[\[queues\.consumers\]\][^[]*/g, '\n');
