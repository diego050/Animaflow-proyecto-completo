import re


def fix_interpolate_mismatch(code: str) -> str:
    """Detecta y corrige mismatches en interpolate(inputRange, outputRange)."""
    pattern = r'interpolate\(([^,]+),\s*\[([^\]]+)\],\s*\[([^\]]+)\]'

    def check_match(m):
        arg = m.group(1)
        input_range = m.group(2)
        output_range = m.group(3)

        input_vals = [x.strip() for x in input_range.split(",")]
        output_vals = [x.strip() for x in output_range.split(",")]
        input_count = len(input_vals)
        output_count = len(output_vals)

        if input_count != output_count:
            if output_count > input_count:
                # Agregar puntos intermedios al input range
                first = input_vals[0]
                last = input_vals[-1]
                new_input = [first]
                for i in range(1, output_count - 1):
                    fraction = f"{i}/{output_count - 1}"
                    new_input.append(f"({first} + ({last} - {first}) * {fraction})")
                new_input.append(last)
                return f"interpolate({arg}, [{', '.join(new_input)}], [{output_range}]"
            else:
                # Recortar output range para que coincida con input
                new_output = output_vals[:input_count]
                return f"interpolate({arg}, [{input_range}], [{', '.join(new_output)}]"
        return m.group(0)

    return re.sub(pattern, check_match, code)


def wrap_radius_with_math_max(code: str) -> str:
    """Envuelve r={{expression}} con Math.max(0, ...) si no está ya protegido."""
    pattern = r'r=\{((?!Math\.max)[^}]+)\}'

    def wrap_match(m):
        expr = m.group(1).strip()
        return f"r={{Math.max(0, {expr})}}"

    return re.sub(pattern, wrap_match, code)
