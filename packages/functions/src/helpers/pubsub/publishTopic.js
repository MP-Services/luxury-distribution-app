import {PubSub} from '@google-cloud/pubsub';

const publishTopic = async (name, data) => {
  const pubSub = new PubSub();
  const topic = pubSub.topic(name, {gaxOpts: {timeout: 540000}});
  const message = Buffer.from(JSON.stringify(data));
  await topic.publish(message);
};

export default publishTopic;
