import React from 'react';
import { Composition } from 'remotion';
import { CourtDiagram, TrackingOverlay, TrajectoryPlot, SpacingAnalysis } from './compositions';
import {
  CourtDiagramSpec,
  TrackingOverlaySpec,
  TrajectorySpec,
  SpacingAnalysisSpec,
} from '../types';

// Default props for Remotion Studio preview
const defaultCourtDiagramSpec: CourtDiagramSpec = {
  type: 'court_diagram',
  title: 'Offensive Formation',
  formationLabel: 'Horns Set',
  players: [
    { id: '1', position: { x: 50, y: 75 }, team: 'offense', jerseyNumber: 1, hasBall: true },
    { id: '2', position: { x: 25, y: 45 }, team: 'offense', jerseyNumber: 2 },
    { id: '3', position: { x: 75, y: 45 }, team: 'offense', jerseyNumber: 3 },
    { id: '4', position: { x: 35, y: 55 }, team: 'offense', jerseyNumber: 4 },
    { id: '5', position: { x: 65, y: 55 }, team: 'offense', jerseyNumber: 5 },
  ],
  arrows: [
    { id: 'a1', from: { x: 50, y: 75 }, to: { x: 50, y: 55 }, label: 'Drive' },
    { id: 'a2', from: { x: 35, y: 55 }, to: { x: 20, y: 35 }, dashed: true },
  ],
};

const defaultTrackingSpec: TrackingOverlaySpec = {
  type: 'tracking_overlay',
  boundingBoxes: [
    { id: '1', x: 20, y: 30, width: 8, height: 15, team: 'home', label: 'Player 1' },
    { id: '2', x: 45, y: 35, width: 8, height: 15, team: 'home', label: 'Player 2' },
    { id: '3', x: 70, y: 40, width: 8, height: 15, team: 'away', label: 'Player 3' },
  ],
};

const defaultTrajectorySpec: TrajectorySpec = {
  type: 'trajectory',
  title: 'Player Movement Paths',
  trajectories: [
    {
      id: 't1',
      playerId: '1',
      team: 'offense',
      label: 'Point Guard',
      points: [
        { x: 50, y: 80 },
        { x: 45, y: 65 },
        { x: 35, y: 50 },
        { x: 30, y: 35 },
      ],
    },
    {
      id: 't2',
      playerId: '2',
      team: 'offense',
      label: 'Shooting Guard',
      points: [
        { x: 75, y: 70 },
        { x: 80, y: 55 },
        { x: 85, y: 40 },
      ],
    },
  ],
  animatePlayback: true,
};

const defaultSpacingSpec: SpacingAnalysisSpec = {
  type: 'spacing_analysis',
  title: 'Offensive Spacing Analysis',
  spacingGrade: 'B',
  players: [
    { id: '1', position: { x: 50, y: 70 }, team: 'offense', jerseyNumber: 1, hasBall: true },
    { id: '2', position: { x: 15, y: 35 }, team: 'offense', jerseyNumber: 2 },
    { id: '3', position: { x: 85, y: 35 }, team: 'offense', jerseyNumber: 3 },
    { id: '4', position: { x: 30, y: 50 }, team: 'offense', jerseyNumber: 4 },
    { id: '5', position: { x: 70, y: 50 }, team: 'offense', jerseyNumber: 5 },
  ],
  spacingMetrics: [
    { id: 'm1', from: { x: 50, y: 70 }, to: { x: 30, y: 50 }, distance: 12.5, isOptimal: true },
    { id: 'm2', from: { x: 50, y: 70 }, to: { x: 70, y: 50 }, distance: 12.5, isOptimal: true },
    { id: 'm3', from: { x: 30, y: 50 }, to: { x: 15, y: 35 }, distance: 10.2, isOptimal: false },
    { id: 'm4', from: { x: 70, y: 50 }, to: { x: 85, y: 35 }, distance: 10.2, isOptimal: false },
  ],
};

/**
 * Remotion Root component - registers all compositions
 * This is used for Remotion Studio preview
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CourtDiagram"
        component={CourtDiagram as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ spec: defaultCourtDiagramSpec }}
      />

      <Composition
        id="TrackingOverlay"
        component={TrackingOverlay as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ spec: defaultTrackingSpec }}
      />

      <Composition
        id="TrajectoryPlot"
        component={TrajectoryPlot as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ spec: defaultTrajectorySpec }}
      />

      <Composition
        id="SpacingAnalysis"
        component={SpacingAnalysis as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ spec: defaultSpacingSpec }}
      />
    </>
  );
};
