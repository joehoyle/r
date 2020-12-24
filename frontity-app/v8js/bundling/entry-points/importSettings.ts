import normalizeSettings from "../../../node_modules/@frontity/file-settings/src/normalizeSettings";
import { NormalizedSettings } from "../../../node_modules/@frontity/file-settings/types";

// This function imports the the settings from a file.
export default async (): Promise<NormalizedSettings[]> => {
  const settings = {
    "name": "frontity-app",
    "state": {
      "frontity": {
        "url": "https://skeleton.altis.dev",
        "title": "Test Frontity Blog",
        "description": "WordPress installation for Frontity development"
      }
    },
    "packages": [
      {
        "name": "@frontity/mars-theme",
        "state": {
          "theme": {
            "menu": [
              [
                "Home",
                "/"
              ],
              [
                "Nature",
                "/category/nature/"
              ],
              [
                "Travel",
                "/category/travel/"
              ],
              [
                "Japan",
                "/tag/japan/"
              ],
              [
                "About Us",
                "/about-us/"
              ]
            ],
            "featured": {
              "showOnList": false,
              "showOnPost": false
            }
          }
        }
      },
      {
        "name": "@frontity/wp-source",
        "state": {
          "source": {
            "url": "https://skeleton.altis.dev"
          }
        }
      },
      "@frontity/tiny-router",
      "@frontity/html2react"
    ]
  };

  return normalizeSettings(settings);
};
