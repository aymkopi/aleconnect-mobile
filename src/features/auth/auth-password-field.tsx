import { useState } from "react";
import type { TextInputProps } from "react-native";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { InputGroup } from "@/components/panelui/input-group";
import { Label } from "@/components/panelui/label";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { View } from "react-native";
import { useAppColors } from "@/hooks/use-app-colors";

export function AuthPasswordField({ label, description, ...props }:
  TextInputProps & { label: string; description?: string }) {
  const [show, setShow] = useState(false);
  const [muted] = useAppColors(["muted-foreground"]);
  const Icon = show ? EyeOff : Eye;
  const disabled = props.editable === false;
  return <View className="gap-1">
    <Label isDisabled={disabled}><Label.Text style={{
      fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 20,
    }}>{label}</Label.Text></Label>
    <InputGroup isDisabled={disabled}>
      <InputGroup.Prefix isDecorative><Lock size={18} color={muted} /></InputGroup.Prefix>
      <InputGroup.Input {...props} disabled={disabled} accessibilityLabel={label}
        className="rounded-xl bg-card" autoCapitalize="none" autoCorrect={false}
        secureTextEntry={!show}
        style={{ height: 48, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 }} />
      <InputGroup.Suffix>
        <Button variant="ghost" size="icon" disabled={disabled}
          style={{ width: 48, height: 48 }}
          accessibilityLabel={(show ? "Hide " : "Show ") + label}
          accessibilityState={{ checked: show, disabled }}
          onPress={() => setShow((value) => !value)}>
          <Icon size={18} color={muted} />
        </Button>
      </InputGroup.Suffix>
    </InputGroup>
    {description ? <Text size="xs" muted style={{ lineHeight: 18 }}>{description}</Text> : null}
  </View>;
}
