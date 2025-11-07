module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 1. Expo Router Navigasyonu için gerekli
      'expo-router/babel', 
      
      // 2. EN STABİL .env OKUMA PLUG-IN'I
      ['module:react-native-dotenv', {
        "moduleName": "@env",
        "path": "./.env",
        "safe": false,
        "allowUndefined": true,
        "verbose": false
      }]
    ],
  };
};