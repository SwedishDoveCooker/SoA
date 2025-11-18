// 文件路径: i18next-parser.config.js
export default {
  locales: ['en'],
  // 关键修改：输出路径改为 locales
  output: 'locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{ts,tsx}'],
  defaultValue: (locale, namespace, key) => key,
  keySeparator: false,
  namespaceSeparator: false,
  sort: true,
};