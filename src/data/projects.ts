import type { BuildingId } from './campus';

export interface ProjectSection {
  title: string;
  text: string;
  code?: string;
}

export interface Project {
  id: string;
  title: string;
  type: 'Software' | 'Hardware';
  accent: string;
  summary: string;
  tools: string[];
  cover?: string;
  illustration: 'game' | 'cad' | 'web';
  /** Where the project lives on the campus map; one project per building. */
  building?: BuildingId;
  github?: string;
  demo?: { label: string; href: string };
  sections: ProjectSection[];
}

const illustrationShapes: Record<Project['illustration'], string> = {
  game: '<circle cx="410" cy="74" r="35" fill="#FFEE8C"/><path d="M0 235 100 160 205 235 330 138 500 235V320H0Z" fill="#c6d7b8"/><path d="M0 266 110 203 215 267 360 197 500 270V320H0Z" fill="#95b799"/><rect x="80" y="218" width="330" height="20" rx="4" fill="#b99d79"/><rect x="208" y="139" width="65" height="79" rx="13" fill="#FAF9F6" stroke="#d9ccad" stroke-width="3"/><circle cx="229" cy="164" r="5" fill="#433e35"/><circle cx="251" cy="164" r="5" fill="#433e35"/><path d="M230 184q10 10 20 0" fill="none" stroke="#433e35" stroke-width="3"/><path d="m132 117 7 15 17 2-12 12 3 17-15-8-15 8 3-17-12-12 17-2Z" fill="#FFEE8C"/>',
  cad: '<g stroke="#7c9ec335" stroke-width="1">' + Array.from({ length: 12 }, (_, i) => `<path d="M${i * 45} 0v320M0${i * 30}h500"/>`).join('') + '</g><ellipse cx="255" cy="263" rx="125" ry="20" fill="#433e3518"/><path d="m140 203 110-58 111 56-110 62Z" fill="#d4ddd5" stroke="#637c6d" stroke-width="3"/><path d="M140 203v29l111 56v-25Z" fill="#8ba497"/><path d="M251 263v25l110-58v-29Z" fill="#a9beb0"/><path d="M245 199v-83l54-47" fill="none" stroke="#7C9EC3" stroke-width="27" stroke-linejoin="round"/><circle cx="245" cy="116" r="18" fill="#FAF9F6" stroke="#637c6d" stroke-width="5"/><circle cx="300" cy="69" r="13" fill="#FFEE8C"/><path d="m303 66 33 17m-33-17 18-26" stroke="#637c6d" stroke-width="10" stroke-linecap="round"/>',
  web: '<rect x="62" y="48" width="376" height="225" rx="8" fill="#FAF9F6" stroke="#c3b595" stroke-width="3"/><path d="M62 78h376" stroke="#c3b595" stroke-width="3"/><circle cx="80" cy="63" r="4" fill="#ff6961"/><circle cx="95" cy="63" r="4" fill="#FFEE8C"/><circle cx="110" cy="63" r="4" fill="#80EF80"/><path d="M72 89h356v174H72Z" fill="#FEFBEA"/><rect x="182" y="105" width="136" height="28" fill="#eee4cb" transform="rotate(-2 250 120)"/><text x="250" y="124" text-anchor="middle" fill="#433e35" font-size="15" font-family="Arial" font-weight="bold">PROJECTS</text><rect x="100" y="155" width="86" height="84" fill="#FAF9F6" stroke="#7C9EC3" stroke-width="5"/><rect x="207" y="155" width="86" height="84" fill="#FAF9F6" stroke="#80EF80" stroke-width="5"/><rect x="314" y="155" width="86" height="84" fill="#FAF9F6" stroke="#7C9EC3" stroke-width="5"/><path d="M111 166h64v39h-64Zm107 0h64v39h-64Zm107 0h64v39h-64Z" fill="#e4ddc8"/>',
};

export function projectIllustration(kind: Project['illustration'], detail = false): string {
  const bg = detail ? '#e9e3d5' : '#eee8d6';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320"><rect width="500" height="320" fill="${bg}"/>${illustrationShapes[kind]}<text x="250" y="306" text-anchor="middle" fill="#726957" font-family="Arial" font-size="10" letter-spacing="2">ILLUSTRATED PLACEHOLDER</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Add projects here: the room carousel, campus map and journal are generated from this list.
export const projects: Project[] = [
  {
    id: 'zoomout', title: 'ZoomOut', type: 'Software', accent: '#7C9EC3',
    summary: 'A HackNC app that finds the full recording behind a viral political clip.',
    tools: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'FastAPI', 'Gemini'],
    cover: 'images/zoomout.jpg', illustration: 'web', building: 'perkins',
    github: 'https://github.com/cepahal/HackNCQuantro',
    demo: { label: 'Try the live demo', href: 'https://quantro-ten.vercel.app' },
    sections: [
      { title: 'The idea', text: 'A few seconds of a speech can travel a long way without the question that came before it or the qualification that came after. At HackNC, four of us built ZoomOut: you paste a clip link (or text it to an iMessage bot), and it tries to find the full recording, locate the matching passage, and show you roughly 30 seconds on either side.' },
      { title: 'How it works', text: 'The backend pulls the media with yt-dlp and FFmpeg, has Gemini transcribe it with word-level timestamps, then searches Exa and YouTube for longer recordings. An alignment step looks for distinctive runs of words that match between the clip and each candidate source. A set of evidence rules turns all of that into a low, moderate, or high confidence rating.' },
      { title: 'My part: the frontend', text: 'I owned the frontend. I wrote the first draft of the Next.js app, then built the analysis report page, the loading states, and the homepage. The piece I spent the most time on is the alignment animation on the landing page, where excerpt cards line up against the full recording in five steps. It shows what the tool does faster than a paragraph could.' },
      { title: 'What I learned', text: 'Most of the design work went into showing uncertainty. A report that says “moderate confidence” has to show why, so the page puts the matched passages, timestamps, and limitations right next to the rating. Our rule for the project was to never claim more than the evidence supports, and that applied to the UI as much as the backend.' },
    ],
  },
  {
    id: 'skynest', title: 'SkyNest RPS', type: 'Software', accent: '#7C9EC3',
    summary: 'A simulator that turns rough Onshape CAD into a robot on an FRC field.',
    tools: ['Python', 'PyBullet', 'PyQt5', 'Onshape', 'URDF', 'PyInstaller'],
    cover: 'images/skynest-rps.jpg', illustration: 'cad', building: 'allen',
    github: 'https://github.com/cepahal/SkyNest',
    sections: [
      { title: 'The idea', text: 'SkyNest RPS is a rapid prototyping system that lets anyone on the team contribute to brainstorming, whatever their technical background. It converts an Onshape assembly built from a custom part library into a movable rig, then drives that rig from an intuitive Excel spreadsheet of commands.' },
      { title: 'How it works', text: 'In Onshape, you name each slider or revolute mate dof_FRC_ followed by a name (like dof_FRC_elevator). An importer I wrapped around onshape-to-robot converts the assembly to a URDF, and the PyQt5 simulator loads it into PyBullet alongside a field STL and a game piece. Then you fill in a timeline: an action (move, rotate, lift, intake, outtake), a target (the base, a joint, or the game piece), a value, and a duration. Hit run and the robot plays it out on the field.' },
      { title: 'Testing & iteration', text: 'Detailed field models put too much strain on PyBullet’s renderer and could crash it, so fields get decimated to under 500k faces (100k is better) and every model renders in a single color. Unlabeled joints break the conversion, so anything that isn’t a slider or revolute should be fastened. I learned PyBullet and PyQt under a deadline and got the simulation running at around 60 FPS, then packaged it with PyInstaller so teammates could run it without setting up Python.' },
      { title: 'What I learned', text: 'The useful part turned out to be who could use it. Teammates who didn’t know the whole simulation stack could still test a concept, and that changed how we brainstormed: more people could try their own ideas instead of waiting on the few who could CAD and code them.' },
    ],
  },
  {
    id: 'frc-2026-robot', title: '2026 FRC Robot', type: 'Hardware', accent: '#80EF80',
    summary: 'Team 4328’s 2026 robot, which I designed in Onshape and fabricated.',
    tools: ['Onshape', 'CAD', 'Fabrication', 'FRC'],
    cover: 'images/frc-2026-robot.jpg', illustration: 'cad', building: 'wallace-wade',
    demo: { label: 'Open the CAD in Onshape', href: 'https://cad.onshape.com/documents/7fb9db58b37623c19d209d1e/w/192299b39688d4f79864343b/e/6ccd52fcbe62c438319f40db' },
    sections: [
      { title: 'The robot', text: 'This is Team 4328’s robot for the 2026 FRC season. I designed the entire model in Onshape and then handled all of the real-world fabrication.' },
      { title: 'Mechanical design', text: 'Game pieces come in through a wide roller intake at the front, collect in a hopper in the middle of the robot, and feed up into a shooter. The shooter sits on a turret that rotates on a large ring gear, so it can aim without turning the whole robot.' },
      { title: 'Exploring the CAD', text: 'The full assembly is public in Onshape (linked above), so you can click through the subassemblies, hide the bumpers, and see how the intake, hopper, and turret fit inside the frame.' },
    ],
  },
  {
    id: 'i3t-handoff-dataset', title: 'I3T Handoff Dataset', type: 'Software', accent: '#7C9EC3',
    summary: 'Manipulation scenes for an AR robot-handoff project at Duke’s I3T Lab.',
    tools: ['Robotics', 'Computer vision', 'Edge ML', 'Dataset design', 'JSON'],
    cover: 'images/i3t-scene.jpg', illustration: 'cad', building: 'gross',
    github: 'https://github.com/cepahal/I3TProject1Dataset',
    sections: [
      { title: 'The project', text: 'At Duke’s I3T (Interactive Internet of Intelligent Things) Lab, we’re working toward an AR system that shows a person how to orient and grip an object so a robot can take it from them more easily. Tony Sang and I are starting on the piece that builds a quick, approximate 3D model of whatever object the headset is looking at. The first step is finding out which existing reconstruction methods are fast and accurate enough to be useful.' },
      { title: 'Collecting the scenes', text: 'Right now we’re collecting data for the VLM and edge ML side of the project. Each scene is a set of photos taken from the point of view of a person helping a robot (think of walking over to see why your Roomba is stuck). One photo can hold several targets, so a single coffee table can produce six examples. Tony and I split the scenes between us, and so far there are 13 scenes with 72 labeled targets.' },
      { title: 'Designing the labels', text: 'I wrote the spec for each scene’s JSON. There are no bounding boxes, so every target description has to pick out exactly one object: “red aluminum can at the back-left of the middle shelf” works, and “can” doesn’t. Each target also records its orientation, nearby obstacles, clearance, and candidate changes that would make it easier to grab, like sliding a book 10 cm toward the edge. The labels describe the scene instead of any one robot, so the same bank can later be paired with robots that have different capabilities.' },
      { title: 'A sample scene', text: 'Here’s part of the write-up for scene S0001, a small pedestal table holding a paperback book, a puzzle box, and an acrylic flyer stand. I trimmed it to the first of its three targets: the book is lying flat with little to grip, so the suggested fix is sliding it toward the edge.', code: `{
  "scene_id": "S0001",
  "images": [
    "images/01.jpg",
    "images/02.jpg"
  ],
  "scene_description": "Small black pedestal table in a corner next to a wall, holding a paperback book, a 1000-piece puzzle box, and an upright acrylic flyer stand.",
  "targets": [
    {
      "target_id": "T001",
      "name": "red paperback book",
      "description": "Paperback book titled 'Strange Tastes' (red cover with flame imagery, yellow title text) lying flat and angled diagonally on the black pedestal surface, near the front-left edge, to the left of the blue Springbok puzzle box.",
      "approximate_dimensions_m": {
        "width": 0.15,
        "depth": 0.23,
        "height": 0.03,
        "measurement_type": "measured"
      },
      "orientation": "flat",
      "nearby_obstacles": [
        "Puzzle box to the right of the book",
        "Upright acrylic flyer stand behind the book"
      ],
      "physically_blocked": false,
      "clearance_notes": "Open space on the front and left sides toward the pedestal edge; book is only about 3 cm thick and lies flush on the surface, leaving little to grip from above or the sides.",
      "manipulation_factors": [
        "awkward_orientation",
        "low_side_clearance"
      ],
      "generic_improvement_needed": true,
      "candidate_improvements": [
        {
          "action": "translate_target",
          "direction": "toward_front_of_surface",
          "distance_cm": null,
          "description": "Slide the book toward the front edge so that a strip along one side is exposed for grasping."
        }
      ],
      "other_notes": "Cover is glossy paperback; thin flat object."
    }
  ]
}` },
    ],
  },
  {
    id: 'firststep', title: 'FirstStep', type: 'Software', accent: '#7C9EC3',
    summary: 'An iPhone app for parents of young kids, built for a Duke pitch event.',
    tools: ['Swift', 'SwiftUI', 'iOS', 'UI design'],
    cover: 'images/firststep.jpg', illustration: 'web', building: 'brodhead',
    github: 'https://github.com/brainnourish/FirstStep',
    sections: [
      { title: 'The idea', text: 'FirstStep is an iOS app for parents of kids up to age five. It builds a daily schedule around your child’s age, serves a tip of the day, lays out developmental milestones with their full normal ranges, and has an Ask tab for questions.' },
      { title: 'My part: UI and flow', text: 'We built it for a Duke startup pitch event. Garner built the backend, and I did all of the UI and the user flowchart, mapping how a parent moves from onboarding to the Today screen, the schedule, the milestone timeline, and the Ask tab. I also did the visual pass on the SwiftUI theme and views.' },
    ],
  },
  {
    id: 'rebloom', title: 'Re:Bloom', type: 'Software', accent: '#7C9EC3',
    summary: 'A Unity puzzle game inside a game, made for TSA Video Game Design 2026.',
    tools: ['Unity', 'C#', 'Game design', 'WebGL'],
    cover: 'images/rebloom.jpg', illustration: 'game', building: 'few',
    demo: { label: 'Play on itch.io', href: 'https://cepahal.itch.io/rebloom' },
    sections: [
      { title: 'The idea', text: 'Re:Bloom is a game inside a game. It moves between a pixel-art world and a 3D room built around an old CRT computer, a stack of floppy disks, and a keypad, and you solve puzzles to help heal the world around your player.' },
      { title: 'My part', text: 'This was a team entry for TSA Video Game Design 2026. I did everything except the music and the art, which meant all of the programming and puzzle design in Unity.' },
      { title: 'Playing it', text: 'It runs in the browser on itch.io, and fullscreen works best. Once you’re in the room, press Q to look around.' },
    ],
  },
  {
    id: 'wizards-tower', title: 'Wizard’s Tower', type: 'Software', accent: '#7C9EC3',
    summary: 'A pixel-art Unity game about descending a wizard’s tower, if you dare.',
    tools: ['Unity', 'C#', 'Pixel art', 'WebGL'],
    cover: 'images/wizards-tower.jpg', illustration: 'game', building: 'chapel',
    demo: { label: 'Play on itch.io', href: 'https://cepahal.itch.io/wizardstower' },
    sections: [
      { title: 'The idea', text: 'Wizard’s Tower is a browser game built in Unity: you start at the top of a wizard’s tower and work your way down.' },
      { title: 'My part', text: 'It was a team project, and I did everything except the music, including the programming and the pixel art you see on the title screen.' },
      { title: 'Playing it', text: 'It runs in the browser on itch.io. Play it fullscreen.' },
    ],
  },
];
