declare module 'react-plotly.js' {
  import { Component } from 'react';
  import Plotly from 'plotly.js';

  interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    onInitialized?: (figure: Readonly<{ data: Plotly.Data[]; layout: Plotly.Layout }>, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: Readonly<{ data: Plotly.Data[]; layout: Plotly.Layout }>, graphDiv: HTMLElement) => void;
    onPurge?: (figure: Readonly<{ data: Plotly.Data[]; layout: Plotly.Layout }>, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    revision?: number;
  }

  class Plot extends Component<PlotParams> {}
  export default Plot;
}

declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  export function heatLayer(latlngs: Array<[number, number, number?]>, options?: object): L.Layer;
}

declare module 'react-leaflet-cluster' {
  import { Component, ReactNode } from 'react';
  interface MarkerClusterGroupProps {
    children: ReactNode;
    [key: string]: unknown;
  }
  export default class MarkerClusterGroup extends Component<MarkerClusterGroupProps> {}
}
