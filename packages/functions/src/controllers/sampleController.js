export async function exampleAction(ctx) {
  const data = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'].map(title => ({
    id: Math.random(),
    title
  }));
  ctx.body = {data, success: true};
}
