import { fab } from "@fortawesome/free-brands-svg-icons";
import {
  fas,
  faBlog,
  faBook,
  faComment,
  faComments,
  faFilePdf,
  faHandshake,
  faLanguage,
  faNewspaper,
  faShop,
  faStar,
  faStore,
  faTag,
  faVideo,
  type IconPack,
} from "@fortawesome/free-solid-svg-icons";

export const POPULAR_ICONS: IconPack = Object.fromEntries(
  Object.entries({
    faBlog,
    faStar,
    faComment,
    faTag,
    faBook,
    faVideo,
    faLanguage,
    faComments,
    faShop,
    faStore,
    faNewspaper,
    faHandshake,
    faFilePdf,
  })
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, icon]) => {
      return [name, icon];
    }),
);
export const POPULAR_ICONS_BY_NAME: IconPack = Object.fromEntries(
  Object.entries(POPULAR_ICONS).map(([name, icon]) => {
    return [icon.iconName, icon];
  }),
);

export const ALL_PICKER_ICONS: IconPack = { ...POPULAR_ICONS, ...fas } as const;
export const ALL_PICKER_ICONS_BY_NAME: IconPack = Object.fromEntries(
  Object.entries(ALL_PICKER_ICONS).map(([name, icon]) => {
    return [icon.iconName, icon];
  }),
);
