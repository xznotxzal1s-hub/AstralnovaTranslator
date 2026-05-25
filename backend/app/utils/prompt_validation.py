from dataclasses import dataclass, field
from string import Formatter


ALLOWED_PROMPT_FIELDS = {"source_text", "translation_mode", "glossary_guidance"}


@dataclass
class PromptTemplateValidationResult:
    is_valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class PromptTemplateValidationError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(" ".join(errors))


def validate_prompt_template(prompt_template: str) -> PromptTemplateValidationResult:
    normalized_template = prompt_template.strip()
    errors: list[str] = []
    warnings: list[str] = []

    if not normalized_template:
        errors.append("Prompt template cannot be empty.")
        return PromptTemplateValidationResult(is_valid=False, errors=errors, warnings=warnings)

    discovered_fields: set[str] = set()
    formatter = Formatter()

    try:
        parsed_template = list(formatter.parse(prompt_template))
    except ValueError as exc:
        errors.append(f"Prompt template has malformed braces: {exc}")
        return PromptTemplateValidationResult(is_valid=False, errors=errors, warnings=warnings)

    for _, field_name, _, _ in parsed_template:
        if field_name is None:
            continue

        if field_name == "":
            errors.append("Prompt template cannot use unnamed placeholders like {}.")
            continue

        if field_name != field_name.split(".", 1)[0] or field_name != field_name.split("[", 1)[0]:
            errors.append(f"Prompt placeholder {{{field_name}}} is not supported.")
            continue

        discovered_fields.add(field_name)
        if field_name not in ALLOWED_PROMPT_FIELDS:
            errors.append(f"Unknown prompt placeholder: {{{field_name}}}.")

    if "source_text" not in discovered_fields:
        errors.append("Prompt template must include {source_text}.")

    if "glossary_guidance" not in discovered_fields:
        warnings.append(
            "Prompt template does not include {glossary_guidance}; glossary guidance will be appended automatically.",
        )

    return PromptTemplateValidationResult(
        is_valid=not errors,
        errors=errors,
        warnings=warnings,
    )


def ensure_prompt_template_is_valid(prompt_template: str) -> None:
    result = validate_prompt_template(prompt_template)
    if not result.is_valid:
        raise PromptTemplateValidationError(result.errors)
