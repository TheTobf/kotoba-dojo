import React from 'react';
import { Composition } from 'remotion';
import { MaskottchenEntwurf, StilEntwurf } from './entwuerfe/Entwuerfe';

const V = { width: 1080, height: 1920, fps: 30, durationInFrames: 60 } as const;
export const Root: React.FC = () => (
  <>
    <Composition id="StilA-Papier" component={StilEntwurf} defaultProps={{ stil: 'papier' as const }} {...V} />
    <Composition id="StilB-Knete" component={StilEntwurf} defaultProps={{ stil: 'knete' as const }} {...V} />
    <Composition id="StilC-Tusche" component={StilEntwurf} defaultProps={{ stil: 'tusche' as const }} {...V} />
    <Composition id="Maskottchen1-Knoedel" component={MaskottchenEntwurf} defaultProps={{ figur: 'knoedel' as const }} {...V} />
    <Composition id="Maskottchen2-Spatz" component={MaskottchenEntwurf} defaultProps={{ figur: 'spatz' as const }} {...V} />
    <Composition id="Maskottchen3-Brezel" component={MaskottchenEntwurf} defaultProps={{ figur: 'brezel' as const }} {...V} />
  </>
);
