import React, { useState, useMemo, useEffect } from 'react';
import { Cpu, Bot, Layers, Radio, Play, Square, Circle, Server, Cog } from 'lucide-react';
import { Panel, Dropdown } from '../shared';
import { fetchDTOptions } from '../../services/liveMonitoringBackend';

/**
 * DT SELECTOR BİLEŞENİ
 * Digital Twin seçim paneli — Cascading (bağımlı) dropdown'lar.
 * 
 * DT Twin seçimi → Subsystem listesini belirler
 * Subsystem seçimi → Signal Set listesini belirler
 * DT System ve Robot Asset sabit seçeneklerdir.
 */
const DTSelector = ({ selected, onChange, isStreaming, onToggleStream, liveAssets = [] }) => {
    // Dropdown seçeneklerini al (DT ve Subsystem seçimine bağlı).
    // liveAssets: OTOKAR_LIVE seçiliyken backend'den (/api/v1/assets) gelen gerçek varlıklar.
    const options = useMemo(
        () => fetchDTOptions(selected.dt, selected.subsystem, liveAssets),
        [selected.dt, selected.subsystem, liveAssets]
    );

    // DT Twin değiştiğinde subsystem ve signalSet'i sıfırla (Otomatik seçim YOK)
    const handleDTChange = (val) => {
        onChange({
            ...selected,
            dt: val,
            subsystem: '',
            signalSet: ''
        });
    };

    // Subsystem değiştiğinde signalSet'i sıfırla (Otomatik seçim YOK)
    const handleSubsystemChange = (val) => {
        onChange({
            ...selected,
            subsystem: val,
            signalSet: ''
        });
    };

    const handleChange = (field, value) => {
        onChange({ ...selected, [field]: value });
    };

    // Tüm alanlar seçili mi kontrolü
    const isReady = Object.values(selected).every(Boolean);

    // Header Action Buttons
    const HeaderAction = (
        <div className="flex items-center gap-3">
            {/* Stream Control */}
            <button
                onClick={onToggleStream}
                disabled={!isStreaming && !isReady}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${isStreaming
                    ? 'bg-error-600 hover:bg-error-700 text-white'
                    : isReady
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
            >
                {isStreaming ? (
                    <>
                        <Square size={14} className="fill-current" />
                        Stop Stream
                    </>
                ) : (
                    <>
                        <Play size={14} className="fill-current" />
                        Start Stream
                    </>
                )}
            </button>

            {/* Stream Status */}
            {isStreaming && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 border border-success-200 rounded-lg">
                    <Circle size={8} className="text-success-500 fill-success-500 animate-pulse" />
                    <span className="text-xs font-semibold text-success-700">LIVE</span>
                </div>
            )}
        </div>
    );

    return (
        <Panel padding="md" className="!overflow-visible relative z-30">
            {/* Custom Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary-600 shadow-sm shadow-primary-200 rounded-lg">
                        <Cpu size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-800">DT Selector</h3>
                        <p className="text-xs text-neutral-500">Twin / System / Robot / Subsystem / Signal Set</p>
                    </div>
                </div>
                {HeaderAction}
            </div>

            {/* Selectors - 5 Dropdown */}
            <div className="flex flex-wrap gap-4">
                {/* 1. DT Twin (Always enabled unless streaming) */}
                <div className="flex-1 min-w-[140px]">
                    <Dropdown
                        label="Digital Twin"
                        icon={Cpu}
                        value={selected.dt}
                        options={options.dts}
                        onChange={handleDTChange}
                        placeholder="Select"
                        disabled={isStreaming}
                    />
                </div>
                {/* 2. DT System (Enabled if DT selected & not streaming) */}
                <div className="flex-1 min-w-[140px]">
                    <Dropdown
                        label="DT System"
                        icon={Server}
                        value={selected.system}
                        options={selected.dt ? options.systems : []}
                        onChange={(val) => handleChange('system', val)}
                        placeholder="Select"
                        disabled={isStreaming || !selected.dt}
                    />
                </div>
                {/* 3. Robot Asset (Enabled if System selected & not streaming) */}
                <div className="flex-1 min-w-[140px]">
                    <Dropdown
                        label="Robot Asset"
                        icon={Bot}
                        value={selected.robot}
                        options={selected.system ? options.robots : []}
                        onChange={(val) => handleChange('robot', val)}
                        placeholder="Select"
                        disabled={isStreaming || !selected.system}
                    />
                </div>
                {/* 4. Subsystem (Enabled if Robot selected + Depends on DT & not streaming) */}
                <div className="flex-1 min-w-[140px]">
                    <Dropdown
                        label="Subsystem"
                        icon={Cog}
                        value={selected.subsystem}
                        options={selected.robot ? options.subsystems : []}
                        onChange={handleSubsystemChange}
                        placeholder="Select"
                        disabled={isStreaming || !selected.robot}
                    />
                </div>
                {/* 5. Signal Set (Enabled if Subsystem selected & not streaming) */}
                <div className="flex-1 min-w-[140px]">
                    <Dropdown
                        label="Signal Set"
                        icon={Radio}
                        value={selected.signalSet}
                        options={selected.subsystem ? options.signalSets : []}
                        onChange={(val) => handleChange('signalSet', val)}
                        placeholder="Select"
                        disabled={isStreaming || !selected.subsystem}
                    />
                </div>
            </div>
        </Panel>
    );
};

export default DTSelector;
