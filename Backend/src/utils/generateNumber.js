const counters = new Map();

const generateNumber = async (prefix) => {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const next = (counters.get(key) || 0) + 1;
  counters.set(key, next);
  return `${prefix}-${year}-${String(next).padStart(5, '0')}`;
};

module.exports = generateNumber;
