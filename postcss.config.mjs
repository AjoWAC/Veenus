const isProd = process.env.NODE_ENV === "production";

export default {
  plugins: {
    "postcss-nested": {},
    "postcss-media-minmax": {},

    "@csstools/postcss-oklab-function": {},
    "@csstools/postcss-color-mix-function": {},

    "@tailwindcss/postcss": {},

    autoprefixer: {},

    ...(isProd
      ? {
          cssnano: {
            preset: "default",
          },
        }
      : {}),
  },
};
