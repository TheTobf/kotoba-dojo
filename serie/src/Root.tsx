import React from 'react';
import { Composition } from 'remotion';
import { MaskottchenEntwurf, StilEntwurf } from './entwuerfe/Entwuerfe';
import { Folge, FolgeProps, folgenDauer } from './folge/Folge';
import { Cover, CoverProps } from './folge/Cover';

const V = { width: 1080, height: 1920, fps: 30, durationInFrames: 60 } as const;
export const Root: React.FC = () => (
  <>
    <Composition id="Folge" component={Folge} width={1080} height={1920} fps={30} durationInFrames={30}
      defaultProps={{} as FolgeProps}
      calculateMetadata={({ props }) => ({ durationInFrames: props.episode ? folgenDauer(props) : 30 })} />
    <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{} as CoverProps} />
    <Composition id="StilA-Papier" component={StilEntwurf} defaultProps={{ stil: 'papier' as const }} {...V} />
    <Composition id="StilB-Knete" component={StilEntwurf} defaultProps={{ stil: 'knete' as const }} {...V} />
    <Composition id="StilC-Tusche" component={StilEntwurf} defaultProps={{ stil: 'tusche' as const }} {...V} />
    <Composition id="Maskottchen1-Knoedel" component={MaskottchenEntwurf} defaultProps={{ figur: 'knoedel' as const }} {...V} />
    <Composition id="Maskottchen2-Spatz" component={MaskottchenEntwurf} defaultProps={{ figur: 'spatz' as const }} {...V} />
    <Composition id="Maskottchen3-Brezel" component={MaskottchenEntwurf} defaultProps={{ figur: 'brezel' as const }} {...V} />
  </>
);
