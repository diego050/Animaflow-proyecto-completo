import pytest
from app.modules.remotion.scene_validator import validate_scene_tsx

def test_validate_scene_tsx_valid():
    tsx = """
import { KineticBackground } from '../../components/KineticBackground';
import { GlitchTitle } from '../../components/GlitchTitle';

export const SceneComponent: React.FC = () => {
    return (
        <AbsoluteFill>
            <KineticBackground color1="#000000" />
            <GlitchTitle text="Test" />
        </AbsoluteFill>
    );
};
"""
    result = validate_scene_tsx(tsx)
    assert result["valid"] is True
    assert len(result["errors"]) == 0

def test_validate_scene_tsx_missing_export():
    tsx = """
const SceneComponent: React.FC = () => {
    return <AbsoluteFill></AbsoluteFill>;
};
"""
    result = validate_scene_tsx(tsx)
    assert result["valid"] is False
    assert "No exporta 'SceneComponent'." in result["errors"][0]

def test_validate_scene_tsx_raw_svg():
    tsx = """
export const SceneComponent: React.FC = () => {
    return (
        <AbsoluteFill>
            <svg width="100" height="100">
                <rect width="100" height="100" fill="red" />
            </svg>
        </AbsoluteFill>
    );
};
"""
    result = validate_scene_tsx(tsx)
    assert result["valid"] is False
    assert any("Utiliza etiquetas SVG crudas" in err for err in result["errors"])

def test_validate_scene_tsx_too_many_components():
    tsx = """
import { C1 } from '../../components/C1';
import { C2 } from '../../components/C2';
import { C3 } from '../../components/C3';
import { C4 } from '../../components/C4';
import { C5 } from '../../components/C5';
import { C6 } from '../../components/C6';
import { C7 } from '../../components/C7';

export const SceneComponent: React.FC = () => {
    return (
        <AbsoluteFill>
            <C1/><C2/><C3/><C4/><C5/><C6/><C7/>
        </AbsoluteFill>
    );
};
"""
    result = validate_scene_tsx(tsx)
    # The validator only throws a warning for > 6 components, it doesn't fail the scene completely
    assert len(result["warnings"]) > 0
    assert any("Usa demasiados componentes" in warn for warn in result["warnings"])

def test_validate_scene_tsx_missing_components():
    tsx = """
export const SceneComponent: React.FC = () => {
    return (
        <AbsoluteFill>
            <h1>Only HTML</h1>
        </AbsoluteFill>
    );
};
"""
    result = validate_scene_tsx(tsx)
    assert result["valid"] is False
    assert any("No utiliza ningún componente de la librería" in err for err in result["errors"])
