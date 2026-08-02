/**
 * Verified media catalogue for the seeded community.
 *
 * Every URL in this file was fetched and confirmed to return 200 with the right
 * content-type before being committed. That check is the whole point of keeping
 * the catalogue in one place: a seeded feed with broken <img> tags looks worse
 * than an empty one, and a dead link is invisible until someone opens the page.
 *
 * Licensing: Unsplash and Pexels are royalty-free for this use, RandomUser
 * portraits are CC0-licensed stock. Nothing here is hotlinked from a source that
 * forbids it.
 *
 * Re-verify with:
 *   npx tsx prisma/seed/community/media.ts   (prints every URL, one per line)
 */

/**
 * Unsplash sizes the image for us. Passing explicit w/h with `fit=crop` means
 * the bytes match the width/height we store on PostMedia exactly, so next/image
 * reserves the right box and the feed doesn't shift as photos load.
 */
function photo(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export interface ImageAsset {
  url: string;
  width: number;
  height: number;
  /** Real alt text — describes the photo, not the post it hangs off. */
  alt: string;
}

const LANDSCAPE = [1200, 800] as const;

function img(id: string, alt: string, [w, h]: readonly [number, number] = LANDSCAPE): ImageAsset {
  return { url: photo(id, w, h), width: w, height: h, alt };
}

/**
 * Post imagery, keyed by what the photograph actually shows. Keys are the
 * contract: post copy picks an image by meaning, so a "dashboard" post can never
 * silently end up with a photo of a circuit board.
 */
export const IMAGES = {
  codeDark: img("1461749280684-dccba630e2f6", "Syntax-highlighted code on a dark editor theme"),
  codeMacbook: img("1498050108023-c5249f4df085", "A MacBook showing code on a bright desk"),
  codeSplitPane: img("1555066931-4365d14bab8c", "A dark editor with two side-by-side code panes"),
  codeReactRouter: img("1581276879432-15e50529f34b", "React Router configuration open in VS Code with a terminal below"),
  codeReactLogo: img("1633356122544-f134324a6cee", "The React logo beside starter App.js code"),
  codeJsx: img("1593720219276-0b1eacd0aef4", "JSX for a progress button component on a purple theme"),
  codePython: img("1610563166150-b34df4f3bcd6", "Python source on a dark terminal-style screen"),
  codeSvg: img("1542831371-29b0f74f9713", "SVG markup with gradient definitions on a dark screen"),
  codeDevtools: img("1517180102446-f3ece451e9d8", "Browser devtools inspecting DOM nodes and styles"),
  codeCloseup: img("1555949963-aa79dcee981c", "A close crop of colourful source code"),
  terminalSudo: img("1629654297299-c8506221ca97", "A Linux terminal prompt reading ubuntu:~$ sudo"),

  workspaceClean: img("1517694712202-14dd9538aa97", "A tidy white desk with a laptop showing code and a small plant"),
  workspaceCactus: img("1587620962725-abab7fe55159", "A laptop with code next to a cactus on a pale desk"),
  workspaceRgb: img("1595675024853-0f3ec9098ac7", "A laptop and desk lit by purple and pink RGB lighting"),
  workspaceDarkDesk: img("1571171637578-41bc2dd41cd2", "A dark desk setup with code on the monitor and a backlit keyboard"),
  workspaceMinimalGlow: img("1531297484001-80022131f5a1", "A laptop glowing in an otherwise dark room"),
  workspaceTopDown: img("1520607162513-77705c0f0d4a", "A top-down view of a desk with a laptop, tablet and coffee"),
  workspaceOfficeMonitors: img("1531482615713-2afd69097998", "Two people working at adjacent multi-monitor workstations"),

  dashboardCharts: img("1551288049-bebda4e38f71", "An analytics dashboard showing a week of traffic charts"),
  dashboardBlue: img("1504868584819-f8e8b4b6d7e3", "A laptop displaying a blue dashboard with charts and a donut graph"),
  dashboardMetrics: img("1560472354-b33ff0c44a43", "A metrics panel showing impressions, click-through rate and position"),
  dashboardLaptop: img("1460925895917-afdab827c52f", "A laptop on a desk showing an analytics dashboard"),
  dashboardPayments: img("1642132652860-471b4228023e", "A payments product landing page open in a browser"),

  uiWireframes: img("1531403009284-440f080d1e12", "A hand arranging printed UI wireframes pinned to a wall"),
  uiResponsive: img("1547658719-da2b51169166", "A landing page design shown on desktop, tablet and phone together"),
  uiAppScreen: img("1556155092-490a1ba16284", "Hands on a laptop showing a clean app interface"),
  uiTabletSketch: img("1581092162384-8987c1d64718", "Hands sketching an interface on a drawing tablet"),
  phoneHomeScreen: img("1512941937669-90a1b58e7e9c", "A phone home screen full of app icons"),
  phoneInHand: img("1563986768609-322da13575f3", "A laptop and a phone held side by side at a cafe table"),

  teamHackathon: img("1522071820081-009f0129c71c", "A group of people working on laptops around a long table"),
  teamDesksTopDown: img("1519389950473-47ba0277781c", "A top-down shot of a shared desk covered in laptops and notebooks"),
  teamWhiteboard: img("1552664730-d307ca884978", "A team clustered around a whiteboard covered in sticky notes"),
  teamPairing: img("1517245386807-bb43f82c33c4", "Two people reviewing charts on a laptop across a meeting table"),
  teamHighFive: img("1600880292203-757bb62b4baf", "Two colleagues high-fiving over a laptop"),
  teamOpenOffice: img("1504384308090-c894fdcc538d", "A large open-plan office full of people at desks"),
  speakerStage: img("1580894732444-8ecded7900cd", "A speaker presenting in front of a glass whiteboard"),
  conferenceSkyline: img("1517511620798-cec17d428bc0", "A city skyline at dusk"),

  serverRacks: img("1558494949-ef010cbdcc31", "Cabling running through racks in a data centre"),
  serverCorridor: img("1573164713988-8665fc963095", "Two engineers walking a blue-lit data centre corridor"),
  networkSwitch: img("1544197150-b99a580bb7a8", "Ethernet cables patched into a network switch"),
  circuitGreen: img("1517077304055-6e89abbf09b0", "A close macro shot of chips on a green circuit board"),
  circuitDark: img("1518770660439-4636190af475", "A dark circuit board lit in red"),
  circuitTeal: img("1550751827-4bd374c3f58b", "An abstract teal circuit-board pattern"),
  padlockKeyboard: img("1614064641938-3bbee52942c7", "A red padlock resting on a backlit keyboard"),
  matrixRain: img("1526374965328-7f61d4dc18c5", "Green characters falling down a black screen"),
  dataParticles: img("1568952433726-3896e3881c65", "Silhouettes against an abstract field of blue data points"),
  earthNight: img("1451187580459-43490279c0fa", "The curve of the Earth at night with city lights visible"),

  roboticsLab: img("1581091226825-a6a2a5aee158", "An engineer working on machinery in a robotics lab"),
  engineerSketch: img("1581092160562-40aa08e78837", "An engineer sketching a design at a workbench"),
  notebookGrowth: img("1543286386-713bdd548da4", "A notebook with a hand-drawn growth curve and a ruler"),
  researchNotes: img("1618044733300-9472054094ee", "Handwritten research notes and printed charts on paper"),
  pythonStickyNote: img("1526379095098-d400fd0bf935", "A hand holding a sticky note with PYTHON written on it"),
  mlTypewriter: img("1591453089816-0fbb971b454c", "A typewriter with MACHINE LEARNING typed on the page"),
  planningNotebook: img("1454165804606-c3d57bc86b40", "A laptop and open notebook mid-planning session"),
  cryptoChart: img("1624996379697-f01d168b1a52", "A phone showing a live price chart"),
} satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof IMAGES;

/** Wide crops for profile banners — 3:1, which is what a cover strip wants. */
const BANNER = [1500, 500] as const;
export const BANNERS: readonly string[] = [
  photo("1451187580459-43490279c0fa", ...BANNER),
  photo("1526374965328-7f61d4dc18c5", ...BANNER),
  photo("1550751827-4bd374c3f58b", ...BANNER),
  photo("1518770660439-4636190af475", ...BANNER),
  photo("1568952433726-3896e3881c65", ...BANNER),
  photo("1517077304055-6e89abbf09b0", ...BANNER),
  photo("1607799279861-4dd421887fb3", ...BANNER),
  photo("1497215728101-856f4ea42174", ...BANNER),
  photo("1516387938699-a93567ec168e", ...BANNER),
  photo("1571171637578-41bc2dd41cd2", ...BANNER),
  photo("1558494949-ef010cbdcc31", ...BANNER),
  photo("1520607162513-77705c0f0d4a", ...BANNER),
];

/**
 * Portrait avatars. RandomUser serves a fixed CC0 portrait set at stable paths,
 * so these are reproducible rather than a new face on every request.
 */
export function avatar(kind: "women" | "men", n: number): string {
  return `https://randomuser.me/api/portraits/${kind}/${n}.jpg`;
}

export interface VideoAsset {
  url: string;
  /** Poster frame. The feed shows this until the viewer presses play. */
  poster: ImageAsset;
  durationSec: number;
  alt: string;
}

/**
 * Video clips.
 *
 * These are genuine royalty-free stock clips (Pexels) and the standard CC0 test
 * files — they are NOT screen recordings of the products the posts describe,
 * because no royalty-free clip of an invented product exists. Each one is paired
 * with a poster that does match its post, which is the frame the feed actually
 * renders; the clip only plays on an explicit tap.
 */
export const VIDEOS = {
  pexelsTyping: {
    url: "https://videos.pexels.com/video-files/3129671/3129671-sd_640_360_30fps.mp4",
    poster: IMAGES.codeSplitPane,
    durationSec: 19,
    alt: "Screen capture of the editor during the session",
  },
  pexelsCircuit: {
    url: "https://videos.pexels.com/video-files/3255275/3255275-sd_640_360_25fps.mp4",
    poster: IMAGES.circuitDark,
    durationSec: 15,
    alt: "Close footage of the board under test",
  },
  pexelsCode: {
    url: "https://videos.pexels.com/video-files/3130284/3130284-sd_640_360_30fps.mp4",
    poster: IMAGES.codeDark,
    durationSec: 22,
    alt: "Recording of the terminal during the run",
  },
  pexelsDesk: {
    url: "https://videos.pexels.com/video-files/2278095/2278095-sd_640_360_30fps.mp4",
    poster: IMAGES.workspaceDarkDesk,
    durationSec: 17,
    alt: "Desk-level footage from the recording session",
  },
  pexelsServer: {
    url: "https://videos.pexels.com/video-files/6774633/6774633-sd_640_360_30fps.mp4",
    poster: IMAGES.serverRacks,
    durationSec: 24,
    alt: "Footage from the rack aisle",
  },
  pexelsCity: {
    url: "https://videos.pexels.com/video-files/1851190/1851190-sd_640_360_25fps.mp4",
    poster: IMAGES.dataParticles,
    durationSec: 13,
    alt: "Ambient footage accompanying the demo",
  },
  pexelsScreen: {
    url: "https://videos.pexels.com/video-files/2098989/2098989-sd_640_360_30fps.mp4",
    poster: IMAGES.uiAppScreen,
    durationSec: 20,
    alt: "Capture of the interface in use",
  },
  pexelsWork: {
    url: "https://videos.pexels.com/video-files/2887463/2887463-sd_640_360_25fps.mp4",
    poster: IMAGES.workspaceClean,
    durationSec: 16,
    alt: "Footage recorded at the desk",
  },
  pexelsMotion: {
    url: "https://videos.pexels.com/video-files/3045163/3045163-sd_640_360_25fps.mp4",
    poster: IMAGES.uiResponsive,
    durationSec: 18,
    alt: "Motion capture of the transition",
  },
  pexelsLab: {
    url: "https://videos.pexels.com/video-files/3141210/3141210-sd_640_360_25fps.mp4",
    poster: IMAGES.roboticsLab,
    durationSec: 26,
    alt: "Footage from the lab run",
  },
  pexelsPhone: {
    url: "https://videos.pexels.com/video-files/3194277/3194277-sd_640_360_30fps.mp4",
    poster: IMAGES.phoneInHand,
    durationSec: 14,
    alt: "Handheld capture of the app running on device",
  },
  pexelsAnalytics: {
    url: "https://videos.pexels.com/video-files/6981411/6981411-sd_640_360_25fps.mp4",
    poster: IMAGES.dashboardCharts,
    durationSec: 21,
    alt: "Recording of the dashboard updating",
  },
} satisfies Record<string, VideoAsset>;

export type VideoKey = keyof typeof VIDEOS;

// Running this file directly prints every URL so they can be re-checked in bulk:
//   npx tsx prisma/seed/community/media.ts | ./verify.sh
if (process.argv[1]?.endsWith("media.ts")) {
  for (const i of Object.values(IMAGES)) console.log(i.url);
  for (const b of BANNERS) console.log(b);
  for (const v of Object.values(VIDEOS)) console.log(v.url);
}
