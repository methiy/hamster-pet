<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="gallery" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="gallery-title">📮 明信片集</h2>
        <div class="postcard-grid">
          <div
            v-for="loc in allLocations"
            :key="loc.id"
            class="postcard-slot"
            :class="{ collected: isCollected(loc.id) }"
          >
            <div v-if="isCollected(loc.id)" class="postcard-card" @click="viewingPostcard = loc.id">
              <svg viewBox="0 0 160 100" class="postcard-svg">
                <component :is="() => renderScene(loc.id)" />
              </svg>
              <div class="postcard-name">{{ loc.emoji }} {{ loc.name }}</div>
            </div>
            <div v-else class="postcard-locked">
              <div class="lock-icon">🔒</div>
              <div class="lock-text">???</div>
            </div>
          </div>
        </div>
        <div class="gallery-footer">
          已收集 {{ collectedCount }} / {{ allLocations.length }}
        </div>
      </div>
    </div>

    <Card3DViewer :visible="viewingPostcard !== null" @close="viewingPostcard = null">
      <div class="postcard-detail" v-if="viewingPostcard">
        <svg viewBox="0 0 160 100" class="postcard-detail-svg">
          <component :is="() => renderScene(viewingPostcard!)" />
        </svg>
        <div class="postcard-detail-name">{{ getLocationName(viewingPostcard) }}</div>
      </div>
    </Card3DViewer>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { locations } from '../data/locations'
import Card3DViewer from './Card3DViewer.vue'

const props = defineProps<{
  collectedPostcards: Set<string>
}>()

const emit = defineEmits<{
  close: []
}>()

const allLocations = locations

const collectedCount = computed(() => props.collectedPostcards.size)
const viewingPostcard = ref<string | null>(null)

function isCollected(id: string): boolean {
  return props.collectedPostcards.has(id)
}

function getLocationName(id: string): string {
  const loc = locations.find(l => l.id === id)
  return loc ? `${loc.emoji} ${loc.name}` : ''
}

function renderScene(locationId: string) {
  const scenes: Record<string, () => any> = {
    park: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 60, width: 160, height: 40, fill: '#7CCD7C' }),
      h('circle', { cx: 135, cy: 25, r: 15, fill: '#FFD700' }),
      // Tree
      h('rect', { x: 28, y: 35, width: 6, height: 30, fill: '#8B6914' }),
      h('circle', { cx: 31, cy: 30, r: 18, fill: '#3CB371' }),
      // Bench
      h('rect', { x: 65, y: 68, width: 30, height: 3, fill: '#8B6914', rx: 1 }),
      h('rect', { x: 68, y: 71, width: 3, height: 10, fill: '#8B6914' }),
      h('rect', { x: 89, y: 71, width: 3, height: 10, fill: '#8B6914' }),
      // Tree 2
      h('rect', { x: 118, y: 40, width: 5, height: 25, fill: '#8B6914' }),
      h('circle', { cx: 120, cy: 35, r: 14, fill: '#2E8B57' }),
    ]),
    beach: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 50, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 50, width: 160, height: 20, fill: '#4682B4' }),
      h('rect', { x: 0, y: 70, width: 160, height: 30, fill: '#F4D35E' }),
      h('circle', { cx: 135, cy: 22, r: 14, fill: '#FFD700' }),
      // Waves
      h('path', { d: 'M0,55 Q20,48 40,55 Q60,62 80,55 Q100,48 120,55 Q140,62 160,55', fill: 'none', stroke: '#5B9BD5', 'stroke-width': 2 }),
      // Palm tree
      h('path', { d: 'M35,75 Q33,50 38,30', fill: 'none', stroke: '#8B6914', 'stroke-width': 4 }),
      h('path', { d: 'M38,30 Q55,25 60,35', fill: 'none', stroke: '#3CB371', 'stroke-width': 3 }),
      h('path', { d: 'M38,30 Q20,25 15,35', fill: 'none', stroke: '#3CB371', 'stroke-width': 3 }),
      h('path', { d: 'M38,30 Q38,15 45,20', fill: 'none', stroke: '#3CB371', 'stroke-width': 3 }),
    ]),
    mountain: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 70, width: 160, height: 30, fill: '#7CCD7C' }),
      // Mountains
      h('polygon', { points: '40,70 70,20 100,70', fill: '#8B8989' }),
      h('polygon', { points: '70,25 80,40 60,40', fill: 'white' }),
      h('polygon', { points: '80,70 120,15 160,70', fill: '#696969' }),
      h('polygon', { points: '120,20 132,38 108,38', fill: 'white' }),
      h('polygon', { points: '0,70 30,35 60,70', fill: '#A9A9A9' }),
      // Clouds
      h('ellipse', { cx: 30, cy: 18, rx: 18, ry: 8, fill: 'white', opacity: 0.8 }),
      h('ellipse', { cx: 130, cy: 12, rx: 14, ry: 6, fill: 'white', opacity: 0.8 }),
    ]),
    supermarket: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 65, width: 160, height: 35, fill: '#D3D3D3' }),
      // Building
      h('rect', { x: 30, y: 30, width: 100, height: 45, fill: '#F5DEB3', rx: 3 }),
      h('rect', { x: 30, y: 25, width: 100, height: 10, fill: '#F2A65A', rx: 2 }),
      // Windows
      h('rect', { x: 42, y: 42, width: 15, height: 12, fill: '#87CEEB', rx: 1 }),
      h('rect', { x: 72, y: 42, width: 15, height: 12, fill: '#87CEEB', rx: 1 }),
      h('rect', { x: 102, y: 42, width: 15, height: 12, fill: '#87CEEB', rx: 1 }),
      // Door
      h('rect', { x: 70, y: 55, width: 20, height: 20, fill: '#87CEEB', rx: 2 }),
      // Cart
      h('rect', { x: 10, y: 72, width: 12, height: 8, fill: '#C0C0C0', rx: 1 }),
      h('circle', { cx: 12, cy: 82, r: 2, fill: '#666' }),
      h('circle', { cx: 20, cy: 82, r: 2, fill: '#666' }),
    ]),
    library: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#F5DEB3' }),
      // Bookshelf
      h('rect', { x: 15, y: 10, width: 90, height: 80, fill: '#8B6914', rx: 2 }),
      h('rect', { x: 18, y: 13, width: 84, height: 18, fill: '#6B4E16' }),
      h('rect', { x: 18, y: 35, width: 84, height: 18, fill: '#6B4E16' }),
      h('rect', { x: 18, y: 57, width: 84, height: 18, fill: '#6B4E16' }),
      // Books row 1
      h('rect', { x: 22, y: 14, width: 6, height: 16, fill: '#E74C3C' }),
      h('rect', { x: 30, y: 16, width: 5, height: 14, fill: '#3498DB' }),
      h('rect', { x: 37, y: 14, width: 7, height: 16, fill: '#2ECC71' }),
      h('rect', { x: 46, y: 15, width: 5, height: 15, fill: '#F39C12' }),
      h('rect', { x: 53, y: 14, width: 6, height: 16, fill: '#9B59B6' }),
      // Books row 2
      h('rect', { x: 22, y: 36, width: 7, height: 16, fill: '#1ABC9C' }),
      h('rect', { x: 31, y: 38, width: 5, height: 14, fill: '#E67E22' }),
      h('rect', { x: 38, y: 36, width: 6, height: 16, fill: '#E74C3C' }),
      h('rect', { x: 46, y: 37, width: 8, height: 15, fill: '#3498DB' }),
      // Lamp
      h('rect', { x: 125, y: 50, width: 3, height: 35, fill: '#C0C0C0' }),
      h('path', { d: 'M115,50 L138,50 L130,38 L123,38 Z', fill: '#FFD700' }),
      h('circle', { cx: 126, cy: 46, r: 4, fill: '#FFFACD' }),
    ]),
    garden: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 55, width: 160, height: 45, fill: '#7CCD7C' }),
      h('circle', { cx: 135, cy: 20, r: 12, fill: '#FFD700' }),
      // Fence
      h('rect', { x: 5, y: 55, width: 150, height: 2, fill: '#DEB887' }),
      h('rect', { x: 10, y: 45, width: 3, height: 15, fill: '#DEB887' }),
      h('rect', { x: 30, y: 45, width: 3, height: 15, fill: '#DEB887' }),
      h('rect', { x: 50, y: 45, width: 3, height: 15, fill: '#DEB887' }),
      h('rect', { x: 70, y: 45, width: 3, height: 15, fill: '#DEB887' }),
      // Flowers
      h('line', { x1: 25, y1: 85, x2: 25, y2: 65, stroke: '#3CB371', 'stroke-width': 2 }),
      h('circle', { cx: 25, cy: 62, r: 5, fill: '#FF69B4' }),
      h('line', { x1: 50, y1: 85, x2: 50, y2: 68, stroke: '#3CB371', 'stroke-width': 2 }),
      h('circle', { cx: 50, cy: 65, r: 5, fill: '#FFD700' }),
      h('line', { x1: 75, y1: 85, x2: 75, y2: 63, stroke: '#3CB371', 'stroke-width': 2 }),
      h('circle', { cx: 75, cy: 60, r: 5, fill: '#FF6347' }),
      h('line', { x1: 100, y1: 85, x2: 100, y2: 70, stroke: '#3CB371', 'stroke-width': 2 }),
      h('circle', { cx: 100, cy: 67, r: 5, fill: '#DA70D6' }),
      // Butterfly
      h('ellipse', { cx: 115, cy: 40, rx: 6, ry: 4, fill: '#FF69B4', opacity: 0.7, transform: 'rotate(-20,115,40)' }),
      h('ellipse', { cx: 123, cy: 40, rx: 6, ry: 4, fill: '#FF69B4', opacity: 0.7, transform: 'rotate(20,123,40)' }),
      h('circle', { cx: 119, cy: 40, r: 1.5, fill: '#333' }),
    ]),
    playground: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 65, width: 160, height: 35, fill: '#F4D35E' }),
      // Swing
      h('rect', { x: 28, y: 20, width: 44, height: 3, fill: '#8B6914' }),
      h('rect', { x: 30, y: 20, width: 3, height: 50, fill: '#8B6914' }),
      h('rect', { x: 69, y: 20, width: 3, height: 50, fill: '#8B6914' }),
      h('line', { x1: 42, y1: 23, x2: 40, y2: 55, stroke: '#666', 'stroke-width': 1.5 }),
      h('line', { x1: 58, y1: 23, x2: 60, y2: 55, stroke: '#666', 'stroke-width': 1.5 }),
      h('rect', { x: 37, y: 55, width: 8, height: 3, fill: '#E74C3C', rx: 1 }),
      h('rect', { x: 57, y: 55, width: 8, height: 3, fill: '#3498DB', rx: 1 }),
      // Slide
      h('rect', { x: 100, y: 25, width: 3, height: 45, fill: '#8B6914' }),
      h('rect', { x: 115, y: 25, width: 3, height: 10, fill: '#8B6914' }),
      h('line', { x1: 117, y1: 30, x2: 145, y2: 65, stroke: '#E74C3C', 'stroke-width': 4 }),
      h('rect', { x: 100, y: 25, width: 18, height: 3, fill: '#8B6914' }),
    ]),
    cafe: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#F5DEB3' }),
      // Window
      h('rect', { x: 10, y: 10, width: 60, height: 50, fill: '#87CEEB', rx: 3 }),
      h('line', { x1: 40, y1: 10, x2: 40, y2: 60, stroke: 'white', 'stroke-width': 2 }),
      h('line', { x1: 10, y1: 35, x2: 70, y2: 35, stroke: 'white', 'stroke-width': 2 }),
      // Table
      h('ellipse', { cx: 110, cy: 65, rx: 25, ry: 8, fill: '#8B6914' }),
      h('rect', { x: 108, y: 65, width: 4, height: 25, fill: '#6B4E16' }),
      // Coffee cup
      h('rect', { x: 100, y: 50, width: 16, height: 15, fill: 'white', rx: 2 }),
      h('path', { d: 'M116,55 Q122,58 116,62', fill: 'none', stroke: '#DEB887', 'stroke-width': 2 }),
      // Steam
      h('path', { d: 'M104,48 Q106,42 108,48', fill: 'none', stroke: '#ccc', 'stroke-width': 1.5 }),
      h('path', { d: 'M109,46 Q111,40 113,46', fill: 'none', stroke: '#ccc', 'stroke-width': 1.5 }),
    ]),
    forest: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#2E8B57' }),
      h('rect', { x: 0, y: 70, width: 160, height: 30, fill: '#3CB371' }),
      // Trees
      h('rect', { x: 18, y: 30, width: 6, height: 45, fill: '#6B4E16' }),
      h('polygon', { points: '21,10 0,45 42,45', fill: '#006400' }),
      h('rect', { x: 48, y: 25, width: 7, height: 50, fill: '#6B4E16' }),
      h('polygon', { points: '51,5 25,40 77,40', fill: '#005500' }),
      h('rect', { x: 85, y: 35, width: 5, height: 40, fill: '#6B4E16' }),
      h('polygon', { points: '87,15 65,50 110,50', fill: '#006400' }),
      h('rect', { x: 120, y: 28, width: 6, height: 47, fill: '#6B4E16' }),
      h('polygon', { points: '123,8 100,43 146,43', fill: '#005500' }),
      h('rect', { x: 145, y: 35, width: 5, height: 40, fill: '#6B4E16' }),
      h('polygon', { points: '147,18 130,48 165,48', fill: '#006400' }),
      // Mushroom
      h('rect', { x: 68, y: 78, width: 4, height: 8, fill: '#F5DEB3' }),
      h('ellipse', { cx: 70, cy: 77, rx: 8, ry: 5, fill: '#E74C3C' }),
      h('circle', { cx: 67, cy: 76, r: 1.5, fill: 'white' }),
      h('circle', { cx: 73, cy: 75, r: 1, fill: 'white' }),
    ]),
    snowmountain: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#B0C4DE' }),
      h('rect', { x: 0, y: 70, width: 160, height: 30, fill: 'white' }),
      // Snowy mountains
      h('polygon', { points: '50,70 80,15 110,70', fill: '#E8E8E8' }),
      h('polygon', { points: '80,20 92,38 68,38', fill: 'white' }),
      h('polygon', { points: '90,70 130,10 160,70', fill: '#D3D3D3' }),
      h('polygon', { points: '130,15 142,35 118,35', fill: 'white' }),
      h('polygon', { points: '0,70 25,30 50,70', fill: '#E0E0E0' }),
      h('polygon', { points: '25,35 34,48 16,48', fill: 'white' }),
      // Snowflakes
      h('text', { x: 15, y: 25, fill: 'white', 'font-size': 10, opacity: 0.8 }, '❄'),
      h('text', { x: 55, y: 50, fill: 'white', 'font-size': 8, opacity: 0.6 }, '❄'),
      h('text', { x: 120, y: 55, fill: 'white', 'font-size': 9, opacity: 0.7 }, '❄'),
      h('text', { x: 85, y: 65, fill: 'white', 'font-size': 7, opacity: 0.5 }, '❄'),
      h('text', { x: 40, y: 15, fill: 'white', 'font-size': 6, opacity: 0.6 }, '❄'),
    ]),
    mine: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#2C2C2C' }),
      h('rect', { x: 0, y: 70, width: 160, height: 30, fill: '#3D3D3D' }),
      // Cave walls
      h('polygon', { points: '0,0 30,25 0,50', fill: '#4A4A4A' }),
      h('polygon', { points: '160,0 130,30 160,60', fill: '#4A4A4A' }),
      // Rails
      h('line', { x1: 20, y1: 85, x2: 140, y2: 85, stroke: '#8B8B8B', 'stroke-width': 2 }),
      h('line', { x1: 25, y1: 90, x2: 135, y2: 90, stroke: '#8B8B8B', 'stroke-width': 2 }),
      // Rail ties
      h('rect', { x: 40, y: 83, width: 3, height: 10, fill: '#6B4E16' }),
      h('rect', { x: 60, y: 83, width: 3, height: 10, fill: '#6B4E16' }),
      h('rect', { x: 80, y: 83, width: 3, height: 10, fill: '#6B4E16' }),
      h('rect', { x: 100, y: 83, width: 3, height: 10, fill: '#6B4E16' }),
      h('rect', { x: 120, y: 83, width: 3, height: 10, fill: '#6B4E16' }),
      // Gems in walls
      h('polygon', { points: '35,35 40,28 45,35 40,38', fill: '#E74C3C', opacity: 0.9 }),
      h('polygon', { points: '110,25 114,20 118,25 114,28', fill: '#3498DB', opacity: 0.9 }),
      h('polygon', { points: '75,45 79,40 83,45 79,48', fill: '#2ECC71', opacity: 0.9 }),
      // Sparkles
      h('text', { x: 42, y: 32, fill: '#FFD700', 'font-size': 6, opacity: 0.8 }, '✨'),
      h('text', { x: 116, y: 22, fill: '#FFD700', 'font-size': 5, opacity: 0.6 }, '✨'),
      h('text', { x: 80, y: 42, fill: '#FFD700', 'font-size': 5, opacity: 0.7 }, '✨'),
      // Lantern
      h('rect', { x: 58, y: 55, width: 2, height: 10, fill: '#8B8B8B' }),
      h('rect', { x: 54, y: 52, width: 10, height: 5, fill: '#FFD700', rx: 1 }),
      h('circle', { cx: 59, cy: 54, r: 6, fill: '#FFD700', opacity: 0.2 }),
    ]),
    island: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 50, fill: '#87CEEB' }),
      h('rect', { x: 0, y: 50, width: 160, height: 20, fill: '#00CED1' }),
      h('rect', { x: 0, y: 70, width: 160, height: 30, fill: '#F4D35E' }),
      h('circle', { cx: 135, cy: 18, r: 14, fill: '#FFD700' }),
      // Waves
      h('path', { d: 'M0,55 Q15,50 30,55 Q45,60 60,55 Q75,50 90,55 Q105,60 120,55 Q135,50 150,55 Q160,58 160,55', fill: 'none', stroke: '#4682B4', 'stroke-width': 1.5 }),
      // Palm tree 1
      h('path', { d: 'M50,75 Q48,50 52,25', fill: 'none', stroke: '#8B6914', 'stroke-width': 4 }),
      h('path', { d: 'M52,25 Q70,18 75,30', fill: 'none', stroke: '#3CB371', 'stroke-width': 3 }),
      h('path', { d: 'M52,25 Q35,18 30,28', fill: 'none', stroke: '#3CB371', 'stroke-width': 3 }),
      h('path', { d: 'M52,25 Q52,10 58,15', fill: 'none', stroke: '#3CB371', 'stroke-width': 3 }),
      // Palm tree 2
      h('path', { d: 'M95,78 Q93,55 97,35', fill: 'none', stroke: '#8B6914', 'stroke-width': 3 }),
      h('path', { d: 'M97,35 Q112,30 115,40', fill: 'none', stroke: '#2E8B57', 'stroke-width': 2.5 }),
      h('path', { d: 'M97,35 Q82,30 80,38', fill: 'none', stroke: '#2E8B57', 'stroke-width': 2.5 }),
      // Footprints (hamster!)
      h('circle', { cx: 60, cy: 82, r: 1.5, fill: '#D2B48C' }),
      h('circle', { cx: 65, cy: 80, r: 1.5, fill: '#D2B48C' }),
      h('circle', { cx: 70, cy: 82, r: 1.5, fill: '#D2B48C' }),
      h('circle', { cx: 75, cy: 80, r: 1.5, fill: '#D2B48C' }),
      // Coconut
      h('circle', { cx: 48, cy: 75, r: 3, fill: '#8B4513' }),
    ]),
    observatory: () => h('g', [
      h('rect', { x: 0, y: 0, width: 160, height: 100, fill: '#1a1a3e' }),
      h('rect', { x: 0, y: 75, width: 160, height: 25, fill: '#2d2d5e' }),
      // Stars
      h('circle', { cx: 15, cy: 12, r: 1, fill: 'white' }),
      h('circle', { cx: 45, cy: 8, r: 1.5, fill: 'white' }),
      h('circle', { cx: 80, cy: 15, r: 1, fill: 'white' }),
      h('circle', { cx: 110, cy: 5, r: 1.5, fill: '#FFD700' }),
      h('circle', { cx: 140, cy: 18, r: 1, fill: 'white' }),
      h('circle', { cx: 25, cy: 30, r: 1, fill: 'white' }),
      h('circle', { cx: 55, cy: 25, r: 1, fill: '#FFD700' }),
      h('circle', { cx: 130, cy: 35, r: 1, fill: 'white' }),
      h('circle', { cx: 95, cy: 28, r: 1.5, fill: 'white' }),
      // Milky way
      h('ellipse', { cx: 80, cy: 20, rx: 70, ry: 8, fill: 'rgba(255,255,255,0.05)', transform: 'rotate(-15,80,20)' }),
      h('ellipse', { cx: 80, cy: 20, rx: 50, ry: 4, fill: 'rgba(255,255,255,0.08)', transform: 'rotate(-15,80,20)' }),
      // Observatory dome
      h('rect', { x: 55, y: 55, width: 50, height: 25, fill: '#4a4a6a' }),
      h('path', { d: 'M55,55 Q80,30 105,55', fill: '#5a5a7a' }),
      // Dome slit
      h('rect', { x: 78, y: 35, width: 4, height: 20, fill: '#1a1a3e' }),
      // Telescope
      h('line', { x1: 80, y1: 45, x2: 65, y2: 25, stroke: '#C0C0C0', 'stroke-width': 3 }),
      h('circle', { cx: 63, cy: 23, r: 4, fill: 'none', stroke: '#C0C0C0', 'stroke-width': 1.5 }),
      // Shooting star
      h('line', { x1: 120, y1: 10, x2: 145, y2: 25, stroke: '#FFD700', 'stroke-width': 1.5, opacity: 0.8 }),
      h('circle', { cx: 120, cy: 10, r: 2, fill: '#FFD700' }),
    ]),
  }

  const sceneFn = scenes[locationId]
  return sceneFn ? sceneFn() : h('g')
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.gallery {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 370px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 12px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
}

.gallery-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.postcard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.postcard-slot {
  aspect-ratio: 1.6;
  border-radius: 6px;
  overflow: hidden;
}

.postcard-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(92, 64, 51, 0.15);
  overflow: hidden;
}

.postcard-svg {
  flex: 1;
  width: 100%;
  display: block;
}

.postcard-name {
  font-size: 9px;
  text-align: center;
  padding: 2px 1px;
  font-weight: 600;
  background: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.postcard-locked {
  width: 100%;
  height: 100%;
  background: #E8DDD4;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.lock-icon {
  font-size: 16px;
  opacity: 0.5;
}

.lock-text {
  font-size: 10px;
  color: #999;
}

.gallery-footer {
  text-align: center;
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}

.postcard-card {
  cursor: pointer;
}

.postcard-card:hover {
  opacity: 0.85;
}

.postcard-detail {
  width: 320px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.postcard-detail-svg {
  width: 100%;
  display: block;
}

.postcard-detail-name {
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  padding: 10px 8px;
  color: #5C4033;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
