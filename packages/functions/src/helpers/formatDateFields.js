export default function formatDateFields(data) {
  const fields = Object.keys(data);
  fields.forEach(field => {
    if (data[field] && data[field].toDate && data[field].toDate()) {
      data[field] = data[field].toDate();
    }
  });

  return data;
}
