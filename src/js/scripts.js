import * as THREE from 'three';
import {GUI} from 'dat.gui';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';

// Initialize renderer
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
//renderer.setClearColor(0x222222);

// Create scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

// Parameters for GUI controls
const params = {
	red: 1.0,
	green: 1.0,
	blue: 1.0,
	threshold: 0.5,
	strength: 0.5,
	radius: 0.8
}

// Set renderer color space
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Initialize render pass
const renderScene = new RenderPass(scene, camera);

// Initialize bloom pass
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

// Initialize effect composer
const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

// Add output pass
const outputPass = new OutputPass();
bloomComposer.addPass(outputPass);

// Set camera position
camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);

// const uniforms = {
// 	u_time: {type: 'f', value: 0.0},
// 	u_frequency: {type: 'f', value: 0.0},
// 	u_red: {type: 'f', value: 1.0},
// 	u_green: {type: 'f', value: 1.0},
// 	u_blue: {type: 'f', value: 1.0}
// }
// Define shader uniforms
const uniforms = {
    u_time: {type: 'f', value: 0.0},
    u_frequency: {type: 'f', value: 0.0},
    u_red: {type: 'f', value: 0.1},
    u_green: {type: 'f', value: 1.0},
    u_blue: {type: 'f', value: 1.0},
    u_audioAmplitude: {type: 'f', value: 0.0} // Add an amplitude uniform
};

// Create shader material
const mat = new THREE.ShaderMaterial({
	uniforms,
	vertexShader: document.getElementById('vertexshader').textContent,
	fragmentShader: document.getElementById('fragmentshader').textContent
});

// Create geometry and mesh
const geo = new THREE.IcosahedronGeometry(4, 30 );
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
mesh.material.wireframe = true;

// Add audio listener to camera
const listener = new THREE.AudioListener();
camera.add(listener);

// Load and play audio
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('./assets/rang.mp3', function(buffer) {
	sound.setBuffer(buffer);
	window.addEventListener('click', function() {
		sound.play();
	});
	window.addEventListener('dblclick', function() {
		sound.pause();
	});
});

// Create audio analyser
const analyser = new THREE.AudioAnalyser(sound, 32);

// Initialize GUI
const gui = new GUI();

// Add color controls to GUI
const colorsFolder = gui.addFolder('Colors');
colorsFolder.add(params, 'red', 0, 1).onChange(function(value) {
	uniforms.u_red.value = Number(value);
});
colorsFolder.add(params, 'green', 0, 1).onChange(function(value) {
	uniforms.u_green.value = Number(value);
});
colorsFolder.add(params, 'blue', 0, 1).onChange(function(value) {
	uniforms.u_blue.value = Number(value);
});

// Add bloom controls to GUI
const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(params, 'threshold', 0, 1).onChange(function(value) {
	bloomPass.threshold = Number(value);
});
bloomFolder.add(params, 'strength', 0, 3).onChange(function(value) {
	bloomPass.strength = Number(value);
});
bloomFolder.add(params, 'radius', 0, 1).onChange(function(value) {
	bloomPass.radius = Number(value);
});

// Track mouse movement
let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function(e) {
	let windowHalfX = window.innerWidth / 2;
	let windowHalfY = window.innerHeight / 2;
	mouseX = (e.clientX - windowHalfX) / 100;
	mouseY = (e.clientY - windowHalfY) / 100;
});

// Animation loop
const clock = new THREE.Clock();
function animate() {
	camera.position.x += (mouseX - camera.position.x) * .05;
	camera.position.y += (-mouseY - camera.position.y) * 0.5;
	camera.lookAt(scene.position);
	uniforms.u_time.value = clock.getElapsedTime();
	uniforms.u_frequency.value = analyser.getAverageFrequency();
    bloomComposer.render();
	requestAnimationFrame(animate);
}
// function animate() {
//     camera.position.x += (mouseX - camera.position.x) * 0.05;
//     camera.position.y += (-mouseY - camera.position.y) * 0.5;
//     camera.lookAt(scene.position);

//     // Update the time and frequency uniforms
//     uniforms.u_time.value = clock.getElapsedTime();
//     uniforms.u_frequency.value = analyser.getAverageFrequency();

//     // Update audio amplitude to modulate the geometry's shape
//     const amplitude = analyser.getAverageFrequency();
//     uniforms.u_audioAmplitude.value = amplitude / 256; // Normalize the amplitude

//     // Update geometry vertices based on audio frequency
//     const vertices = mesh.geometry.attributes.position.array;
//     for (let i = 0; i < vertices.length; i += 3) {
//         let vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
//         const factor = (Math.sin(uniforms.u_time.value + vertex.x) + Math.cos(uniforms.u_time.value + vertex.y)) * uniforms.u_audioAmplitude.value;
//         vertex.multiplyScalar(1 + factor); // Apply audio-driven deformation
//         vertices[i] = vertex.x;
//         vertices[i + 1] = vertex.y;
//         vertices[i + 2] = vertex.z;
//     }
//     mesh.geometry.attributes.position.needsUpdate = true;

//     bloomComposer.render();
//     requestAnimationFrame(animate);
// }
animate();

// Handle window resize
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
});