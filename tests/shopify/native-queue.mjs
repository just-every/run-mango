// Exercise the installed Miniflare broker, including its real retry schedule.
// Only its test clock advances: messages, deliveries, attempts and acknowledgements
// are native, and productionWorker.queue receives every delivery.
export async function nativeQueueSettlement(mf,db,queueName){
    const namespace=await mf._getInternalDurableObjectNamespace('queues','queues:queue','QueueBrokerObject');
    const broker=namespace.get(namespace.idFromName(queueName));
    const clock=async(name,...args)=>{const response=await broker.fetch('http://queue-control',{cf:{miniflare:{name:queueName,controlOp:{name,args}}}});if(!response.ok)throw new Error(await response.text());};
    await clock('enableFakeTimers',Date.now());
    let outcomeCursor=0;
    return async()=>{
      await clock('waitForFakeTasks');
      let rows=(await db.prepare('SELECT id,body FROM test_queue_outcomes WHERE id>? ORDER BY id').bind(outcomeCursor).all()).results;
      if(!rows.length){
        const previous=await db.prepare('SELECT body FROM test_queue_outcomes ORDER BY id DESC LIMIT 1').first();
        const outcome=previous&&JSON.parse(previous.body);
        if(!outcome||outcome.ack)throw new Error('No native queue delivery to settle');
        await clock('advanceFakeTime',outcome.delaySeconds*1000);
        await clock('waitForFakeTasks');
        rows=(await db.prepare('SELECT id,body FROM test_queue_outcomes WHERE id>? ORDER BY id').bind(outcomeCursor).all()).results;
      }
      if(!rows.length)throw new Error('Native queue produced no settlement');
      outcomeCursor=rows.at(-1).id;
      return Response.json(rows.map(row=>JSON.parse(row.body)));
    };
}
