import json

import pytest

from services.project_starter import get_template_files, REACT_TEMPLATE, VUE_TEMPLATE, HTML_TEMPLATE


def _find_file(files, file_path):
    for f in files:
        if f["file_path"] == file_path:
            return f
    return None


def _parse_package_json(files):
    pkg = _find_file(files, "package.json")
    assert pkg is not None, "template must include package.json"
    return json.loads(str(pkg["content"]))


class TestGetTemplateFiles:
    def test_react_has_six_files(self):
        assert len(REACT_TEMPLATE) == 6

    def test_vue_has_six_files(self):
        assert len(VUE_TEMPLATE) == 6

    def test_html_has_four_files(self):
        assert len(HTML_TEMPLATE) == 4

    def test_react_package_json_has_vite_dev_script(self):
        pkg = _parse_package_json(REACT_TEMPLATE)
        assert pkg["scripts"]["dev"] == "vite"

    def test_vue_package_json_has_vite_dev_script(self):
        pkg = _parse_package_json(VUE_TEMPLATE)
        assert pkg["scripts"]["dev"] == "vite"

    def test_html_package_json_has_vite_dev_script(self):
        pkg = _parse_package_json(HTML_TEMPLATE)
        assert pkg["scripts"]["dev"] == "vite"

    def test_all_file_paths_are_relative(self):
        for template in [REACT_TEMPLATE, VUE_TEMPLATE, HTML_TEMPLATE]:
            for f in template:
                path = str(f["file_path"])
                assert not path.startswith("/"), f"path must be relative: {path}"
                assert ".." not in path, f"path must not contain ..: {path}"

    def test_react_includes_index_html_with_root_div(self):
        index_html = _find_file(REACT_TEMPLATE, "index.html")
        assert index_html is not None
        content = str(index_html["content"])
        assert 'id="root"' in content

    def test_vue_includes_app_vue_sfc(self):
        app = _find_file(VUE_TEMPLATE, "src/App.vue")
        assert app is not None
        content = str(app["content"])
        assert "<template>" in content
        assert "<script setup" in content

    def test_html_includes_main_js(self):
        main = _find_file(HTML_TEMPLATE, "src/main.js")
        assert main is not None

    def test_get_template_files_react(self):
        files = get_template_files("react")
        assert len(files) == len(REACT_TEMPLATE)

    def test_get_template_files_vue(self):
        files = get_template_files("vue")
        assert len(files) == len(VUE_TEMPLATE)

    def test_get_template_files_html(self):
        files = get_template_files("html")
        assert len(files) == len(HTML_TEMPLATE)

    def test_get_template_files_case_insensitive(self):
        assert len(get_template_files("React")) == len(REACT_TEMPLATE)

    def test_get_template_files_none_defaults_to_react(self):
        files = get_template_files(None)
        assert len(files) == len(REACT_TEMPLATE)

    def test_get_template_files_unknown_raises(self):
        with pytest.raises(ValueError, match="Unsupported framework"):
            get_template_files("svelte")
