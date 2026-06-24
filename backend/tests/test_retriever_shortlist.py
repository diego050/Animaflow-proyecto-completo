"""Tests del catálogo de modelos (multi-proveedor) y el tamaño de shortlist por tier."""
from app.services.model_catalog import (
    shortlist_size_for_model,
    tier_for_model,
    get_model_info,
    SHORTLIST_BY_TIER,
    TIER_LITE,
    TIER_STANDARD,
    TIER_PRO,
)


def test_knob_defaults():
    # Valores acordados (knob ajustable): lite 70, standard 110, pro 170.
    assert SHORTLIST_BY_TIER == {TIER_LITE: 70, TIER_STANDARD: 110, TIER_PRO: 170}


def test_tier_by_model_gemini():
    assert tier_for_model("gemini-3.1-flash-lite") == TIER_LITE
    assert tier_for_model("gemini-3.1-flash") == TIER_STANDARD
    assert tier_for_model("gemini-2.5-pro") == TIER_PRO


def test_tier_by_model_multiprovider():
    # No depende de string-matching de marca: cada modelo está en el catálogo.
    assert tier_for_model("claude-haiku-4-5-20251001") == TIER_LITE
    assert tier_for_model("claude-sonnet-4-6") == TIER_STANDARD
    assert tier_for_model("claude-opus-4-8") == TIER_PRO


def test_shortlist_size_maps_through_tier():
    assert shortlist_size_for_model("gemini-3.1-flash-lite") == 70
    assert shortlist_size_for_model("claude-opus-4-8") == 170


def test_prefix_and_path_tolerance():
    # variante con fecha y prefijo 'models/'
    assert tier_for_model("claude-opus-4-8-20260101") == TIER_PRO
    assert tier_for_model("models/gemini-3.1-flash-lite") == TIER_LITE


def test_unknown_model_defaults_to_standard():
    assert tier_for_model("modelo-inexistente-9000") == TIER_STANDARD
    assert tier_for_model(None) == TIER_STANDARD
    assert get_model_info("modelo-inexistente-9000") is None


def test_catalog_has_provider_info():
    info = get_model_info("gemini-3.1-flash")
    assert info is not None and info.provider == "gemini"
    info = get_model_info("claude-opus-4-8")
    assert info is not None and info.provider == "anthropic"
